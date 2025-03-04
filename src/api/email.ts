// @ts-nocheck
import axios from 'axios';
import imap from 'imap';
import { simpleParser } from 'mailparser';
import express from 'express';
import { DataResponse } from '../interfaces/MessageResponse';

const router = express.Router();

const getCodeFromEmailContent = (emailContent: string) => {
  const regex = /Please enter the following code.*?<span style=".*?">(\d+)<\/span>/;
  return emailContent.match(regex);
};

async function getAccessToken(clientId: string, refreshToken: string) {
  const url = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  const data = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  try {
    const response = await axios.post(url, data);
    if (response.data.error) {
      console.error(response.data.error);
      return [false, `邮箱状态异常：${response.data.error}`];
    }
    return [true, response.data.access_token];
  } catch (error) {
    console.error('获取令牌时出错：', error.message);
    return [false, '获取令牌失败，请检查网络或凭据。'];
  }
}

async function getMailInfo(emailName: string, accessToken: string) {
  const resultList = [];

  let base64Encoded = Buffer.from(
    [`user=${emailName}`, `auth=Bearer ${accessToken}`, '', ''].join('\x01'),
    'utf-8',
  ).toString('base64');

  var mailClient = new imap({
    xoauth2: base64Encoded,
    host: 'outlook.office365.com',
    port: 993,
    tls: true,
    // debug: console.log,
    authTimeout: 60000, // 增加认证超时
    connTimeout: 60000, // 增加连接超时
    tlsOptions: {
      rejectUnauthorized: false,
      servername: 'outlook.office365.com',
    },
  });

  return new Promise((resolve, reject) => {
    mailClient.once('ready', () => {
      mailClient.openBox('INBOX', false, (err, box) => {
        if (err) {
          mailClient.end();
          return reject({ error_key: '登录失败', error_msg: '登录失败，账号异常!' });
        }

        mailClient.search(['ALL'], (err, results) => {
          if (err) {
            mailClient.end();
            return reject({ error_key: '搜索失败', error_msg: '邮件搜索失败！' });
          }

          const mailIds = results.slice(-2).reverse();
          let processedCount = 0;

          if (mailIds.length === 0) {
            mailClient.end();
            return resolve([]); // 没有邮件时返回空数组
          }

          const fetch = mailClient.fetch(mailIds, { bodies: '' });

          fetch.on('message', (msg) => {
            let rawEmail = '';

            msg.on('body', (stream) => {
              stream.on('data', (chunk) => {
                rawEmail += chunk.toString();
              });
            });

            msg.once('end', async () => {
              try {
                const emailMessage = await simpleParser(rawEmail);
                resultList.push({
                  mail_from: emailMessage.from?.text || '未知发件人',
                  body: emailMessage.html || emailMessage.text || '无内容',
                });

                processedCount++;
                if (processedCount === mailIds.length) {
                  mailClient.end();
                  resolve(resultList); // 所有邮件处理完成后才返回结果
                }
              } catch (err) {
                processedCount++;
                if (processedCount === mailIds.length) {
                  mailClient.end();
                  resolve(resultList);
                }
              }
            });
          });

          fetch.once('error', (err) => {
            mailClient.end();
            reject({ error_key: '获取失败', error_msg: '邮件获取失败，请检查！' });
          });
        });
      });
    });

    mailClient.once('error', (err) => {
      reject({ error_key: '登录失败', error_msg: `登录失败：${err.message}` });
    });

    mailClient.connect();
  });
}

async function getVerificationCodeFromOutlook(emailName: string, clientId: string, refreshToken: string) {
  try {
    if (!emailName || !clientId || !refreshToken) {
      throw new Error('缺少必要的参数');
    }

    const accessRes = await getAccessToken(clientId, refreshToken).catch(error => {
      throw new Error(`获取 access token 失败: ${error.message}`);
    });

    if (!accessRes[0]) {
      throw new Error(accessRes[1]);
    }

    const accessToken = accessRes[1];
    const mailInfoRes = await getMailInfo(emailName, accessToken).catch(error => {
      throw new Error(`获取邮件信息失败: ${error.message}`);
    });

    if (!mailInfoRes || !Array.isArray(mailInfoRes) || mailInfoRes.length === 0) {
      throw new Error('未找到邮件');
    }

    for (const mailInfo of mailInfoRes) {
      try {
        const match = getCodeFromEmailContent(mailInfo.body);
        if (match && match[1]) {
          return match[1];
        }
      } catch (error) {
        console.error('解析邮件内容失败:', error);
      }
    }

    throw new Error('未找到验证码');
  } catch (error) {
    // 确保错误被正确传播
    throw error instanceof Error ? error : new Error(String(error));
  }
}

router.get<{}, DataResponse>('/', async (req, res) => {
  try {
    const { emailName, clientId, refreshToken } = req.query;
    console.log('emailName:', emailName);
    console.log('clientId:', clientId);
    console.log('refreshToken:', refreshToken);
    const code = await getVerificationCodeFromOutlook(
      emailName as string,
      clientId as string,
      refreshToken as string,
    );
    console.log('code:', code);
    res.json({ status: 200, message: '获取验证码成功', data: code });
  } catch (error) {
    res.status(400).json({ status: 400, message: error.message });
  }
});

export default router;
