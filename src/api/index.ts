import express from 'express';

import MessageResponse from '../interfaces/MessageResponse';
import emojis from './emojis';

const router = express.Router();

router.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: 'API - 👋🌎🌍🌏 - Nested Routes',
  });
});

router.use('/emojis', emojis);

export default router;
