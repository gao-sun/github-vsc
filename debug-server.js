const path = require('path');
const express = require('express');
const serveStatic = require('serve-static');
const { createServer } = require('https');
const { readFileSync } = require('fs');

const staticBasePath = './app';

const app = express();
const server = createServer(
  { key: readFileSync('./cert/localhost-key.pem'), cert: readFileSync('./cert/localhost.pem') },
  app,
);

app.use(serveStatic(staticBasePath, { fallthrough: true }));
app.use((_, res) => res.sendFile(path.resolve(__dirname, './app/index.html')));

server.listen(8080, () => console.log('Listening on port 8080'));
