# NodeJS Serverless Function Express

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FWinter-Soren%2Fnodejs-serverless-function-express)

## About

This template facilitates the creation of a NodeJS serverless function with Express, ideally for deployment on Vercel. 

Feel free to tailor the code to your requirements. However, please bear in mind that this template is optimized for Vercel deployment. If you intend to deploy it elsewhere (as a serverless function), some modifications may be necessary.

## How to use this template:

1. Click the "Use this template" button on the GitHub repository

2. Clone the repository to your local machine

```bash
git clone https://github.com/Winter-Soren/nodejs-serverless-function-express.git
```

## Installation

```
npm install
```

## Lint

```
npm run lint
```

## Test

```
npm run test
```

## Development

```
npm run dev
```


This template incorporates API Server utilities:

* [morgan](https://www.npmjs.com/package/morgan) - for logging HTTP requests
* [helmet](https://www.npmjs.com/package/helmet) - to enhance Express app security by configuring various HTTP headers
* [cors](https://www.npmjs.com/package/cors) - for enabling CORS with versatile options