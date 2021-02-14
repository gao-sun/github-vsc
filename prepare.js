const fs = require('fs');
const fse = require('fs-extra');
const child_process = require('child_process');

if (fs.existsSync(`./app/dist`)) {
  fs.rmdirSync(`./app/dist`, { recursive: true });
}

if (fs.existsSync('./app/lib')) {
  fs.rmdirSync('./app/lib', { recursive: true });
}

fse.copySync('./dist', './app/dist');
fse.copySync('./node_modules/semver-umd', './app/lib/semver-umd');
fse.copySync('./node_modules/vscode-oniguruma', './app/lib/vscode-oniguruma');
fse.copySync('./node_modules/vscode-textmate', './app/lib/vscode-textmate');

if (fs.existsSync('./app/dist/extensions/github-vsc')) {
  fs.rmdirSync('./app/dist/extensions/github-vsc', { recursive: true });
}

process.chdir('./extensions/github-vsc');
child_process.execSync('yarn', { stdio: 'inherit' });
child_process.execSync('yarn compile', { stdio: 'inherit' });

process.chdir('../..');
fse.copySync('./extensions/github-vsc', './app/dist/extensions/github-vsc');

const packageJSON = fs.readFileSync('./app/dist/extensions/github-vsc/package.json');
const extensions = [{ packageJSON: JSON.parse(packageJSON), extensionPath: 'github-vsc' }];

const content = `var githubVSC=${JSON.stringify(extensions)}`;

fs.writeFileSync('./app/github-vsc.js', content);
