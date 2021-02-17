const fs = require('fs');
const fse = require('fs-extra');

if (fs.existsSync(`./app/dist/extensions/github-vsc`)) {
  fs.rmdirSync(`./app/dist/extensions/github-vsc`, { recursive: true });
}

fse.copySync('./extensions/github-vsc', './app/dist/extensions/github-vsc', {
  overwrite: true,
  filter: (src) => !src.includes('node_modules'),
});

fs.rmdirSync(`./app/dist/extensions/github-vsc/src`, { recursive: true });
