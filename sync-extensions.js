const fs = require('fs');
const fse = require('fs-extra');
const debounce = require('debounce-fn');

if (fs.existsSync(`./app/dist/extensions/github-vsc`)) {
  fs.rmdirSync(`./app/dist/extensions/github-vsc`, { recursive: true });
}

fse.copySync('./extensions/github-vsc', './app/dist/extensions/github-vsc', {
  overwrite: true,
  filter: (src) => !src.includes('node_modules'),
});

fs.watch('./extensions/github-vsc/static', () => {
  console.log('syncing static');
  fse.copySync('./extensions/github-vsc/static', './app/dist/extensions/github-vsc/static', {
    overwrite: true,
  });
  console.log('done');
});

const syncDist = debounce(
  () => {
    console.log('syncing dist');
    fse.copySync('./extensions/github-vsc/dist', './app/dist/extensions/github-vsc/dist', {
      overwrite: true,
    });
    console.log('done');
  },
  { wait: 100 },
);

fs.watch('./extensions/github-vsc/dist', syncDist);

fs.watch('./extensions/github-vsc/package.json', () => {
  console.log('syncing package.json');
  fse.copySync(
    './extensions/github-vsc/package.json',
    './app/dist/extensions/github-vsc/package.json',
    {
      overwrite: true,
    },
  );
  const packageJSON = fs.readFileSync('./app/dist/extensions/github-vsc/package.json');
  const extensions = [{ packageJSON: JSON.parse(packageJSON), extensionPath: 'github-vsc' }];

  const content = `var githubVSC=${JSON.stringify(extensions)}`;

  fs.writeFileSync('./app/github-vsc.js', content);
  console.log('done');
});

console.log('watching extension changes');
