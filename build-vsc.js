// modified from https://github.com/Felx-B/vscode-web
const process = require('process');
const child_process = require('child_process');
const fs = require('fs');
const fse = require('fs-extra');
const glob = require('glob');
const rmdir = require('rimraf');

const vscodeVersion = '1.53.2';

if (!fs.existsSync('vscode')) {
  child_process.execSync('git clone https://github.com/microsoft/vscode.git', {
    stdio: 'inherit',
  });
}
process.chdir('vscode');

child_process.execSync(`git checkout -q ${vscodeVersion}`, {
  stdio: 'inherit',
});

child_process.execSync('yarn', { stdio: 'inherit' });

// Patch VSCode
const patchPath = '../vscode-patch';
const extendedSuffix = '.extended.ts';

glob.sync(`${patchPath}/**/*.*`).forEach((value) => {
  const targetFile = value.slice(patchPath.length);

  if (value.endsWith(extendedSuffix)) {
    const targetPath = `.${targetFile.slice(0, -extendedSuffix.length)}.ts`;

    child_process.execSync(`git checkout ${targetPath}`, {
      stdio: 'inherit',
    });
    fs.appendFileSync(targetPath, fs.readFileSync(value));
    return;
  }

  fse.copySync(value, `.${targetFile}`, { overwrite: true });
});

// Adapt compilation to web
const gulpfilePath = './build/gulpfile.vscode.js';
let gulpfile = fs.readFileSync(gulpfilePath, { encoding: 'utf8', flag: 'r' });

gulpfile = gulpfile
  .replace(/vs\/workbench\/workbench.desktop.main/g, 'vs/workbench/workbench.web.api')
  .replace(/buildfile.workbenchDesktop/g, 'buildfile.workbenchWeb,buildfile.keyboardMaps');

fs.writeFileSync(gulpfilePath, gulpfile);

// Compile
child_process.execSync('yarn gulp compile-build', { stdio: 'inherit' });
child_process.execSync('yarn gulp minify-vscode', { stdio: 'inherit' });
child_process.execSync('yarn compile-web', { stdio: 'inherit' });

// Remove maps
const mapFiles = glob.sync('out-vscode-min/**/*.js.map', {});
mapFiles.forEach((mapFile) => {
  fs.unlinkSync(mapFile);
});

// Extract compiled files
if (fs.existsSync('../dist')) {
  fs.rmdirSync('../dist', { recursive: true });
}
fs.mkdirSync('../dist');
fse.copySync('out-vscode-min', '../dist/vscode');

const extensionFilesToRemove = [
  ...glob.sync('extensions/**/node_modules', {}),
  ...glob.sync('extensions/**/*.js.map', {}),
];
extensionFilesToRemove.forEach((path) => {
  rmdir.sync(path, { recursive: true });
});
fse.copySync('extensions', '../dist/extensions');

// Add built in extensions
const extensions = [];

const extensionsFolderPath = 'extensions';
const extensionsContent = fs.readdirSync(extensionsFolderPath);
for (const extension of extensionsContent) {
  const extensionPath = `${extensionsFolderPath}/${extension}`;
  if (fs.statSync(extensionPath).isDirectory()) {
    const extensionPackagePath = `${extensionPath}/package.json`;
    const extensionPackageNLSPath = `${extensionPath}/package.nls.json`;

    if (!fs.existsSync(extensionPackagePath)) {
      continue;
    }

    const packageJSON = JSON.parse(fs.readFileSync(extensionPackagePath));
    let packageNLS = null;

    if (fs.existsSync(extensionPackageNLSPath)) {
      packageNLS = JSON.parse(fs.readFileSync(extensionPackageNLSPath));
    }

    extensions.push({
      packageJSON,
      extensionPath: extension,
      packageNLS,
    });
  }
}

const extensionsVar = 'var extensions =' + JSON.stringify(extensions, { space: '\t', quote: '' });

fs.writeFileSync('../dist/extensions.js', extensionsVar);
