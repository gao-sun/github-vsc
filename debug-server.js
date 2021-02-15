const path = require('path');
const express = require('express');
const serveStatic = require('serve-static');

const staticBasePath = './app';

const app = express();

app.use(serveStatic(staticBasePath, { fallthrough: true }));
app.use((_, res) => res.sendFile(path.resolve(__dirname, './app/index.html')));
app.listen(8080);
console.log('Listening on port 8080');
