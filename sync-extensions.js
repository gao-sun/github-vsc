const fs = require('fs');
const fse = require('fs-extra');

if (fs.existsSync(`./app/dist/extensions/github-vsc`)) {
  fs.rmdirSync(`./app/dist/extensions/github-vsc`, { recursive: true });
}

fse.copySync('./extensions/github-vsc', './app/dist/extensions/github-vsc', {
  overwrite: true,
  filter: (src) => !src.includes('node_modules'),
});

fs.watch('./extensions/github-vsc/dist/extension.js', () => {
  console.log('syncing dist');
  fse.copySync('./extensions/github-vsc/dist', './app/dist/extensions/github-vsc/dist', {
    overwrite: true,
  });
});

fs.watch('./extensions/github-vsc/package.json', () => {
  console.log('syncing package.json');
  const packageJSON = fs.readFileSync('./app/dist/extensions/github-vsc/package.json');
  const extensions = [{ packageJSON: JSON.parse(packageJSON), extensionPath: 'github-vsc' }];

  const content = `var githubVSC=${JSON.stringify(extensions)}`;

  fs.writeFileSync('./app/github-vsc.js', content);
});

console.log('watching extension changes');
