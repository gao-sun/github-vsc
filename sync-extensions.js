const fs = require('fs');
const fse = require('fs-extra');
const child_process = require('child_process');

process.chdir('./extensions/github-vsc');
child_process.execSync('yarn compile', { stdio: 'inherit' });

process.chdir('../..');

if (fs.existsSync(`./app/dist/extensions/github-vsc`)) {
  fs.rmdirSync(`./app/dist/extensions/github-vsc`, { recursive: true });
}
fse.copySync('./extensions/github-vsc', './app/dist/extensions/github-vsc', {
  filter: (src) => !src.includes('node_modules'),
});

const packageJSON = fs.readFileSync('./app/dist/extensions/github-vsc/package.json');
const extensions = [{ packageJSON: JSON.parse(packageJSON), extensionPath: 'github-vsc' }];

const content = `var githubVSC=${JSON.stringify(extensions)}`;

fs.writeFileSync('./app/github-vsc.js', content);
