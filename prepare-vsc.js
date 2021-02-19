const fs = require('fs');
const fse = require('fs-extra');

if (fs.existsSync(`./app/dist`)) {
  fs.rmdirSync(`./app/dist`, { recursive: true });
}

if (fs.existsSync('./app/lib')) {
  fs.rmdirSync('./app/lib', { recursive: true });
}

fse.copySync('./dist', './app/dist');
fse.copySync('./node_modules/semver-umd', './app/lib/semver-umd');
fse.copySync('./node_modules/iconv-lite-umd', './app/lib/iconv-lite-umd');
fse.copySync('./node_modules/vscode-oniguruma', './app/lib/vscode-oniguruma');
fse.copySync('./node_modules/vscode-textmate', './app/lib/vscode-textmate');
