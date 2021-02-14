const child_process = require('child_process');

process.chdir('./extensions/github-vsc');
child_process.execSync('yarn', { stdio: 'inherit' });
