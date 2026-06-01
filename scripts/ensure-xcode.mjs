import { execSync } from 'node:child_process';

function run(command) {
  return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function licenseErrorMessage() {
  console.error('\nXcode 26.5 is installed, but its license has not been accepted yet.');
  console.error('Run this once in Terminal (enter your Mac password when prompted):\n');
  console.error('  sudo xcodebuild -license accept\n');
  console.error('Then run:\n');
  console.error('  npm run ios\n');
}

for (const command of ['xcodebuild -version', 'git --version', 'swift --version']) {
  try {
    run(command);
  } catch (error) {
    const message = `${error.stderr ?? ''}${error.stdout ?? ''}${error.message ?? ''}`;

    if (message.includes('license')) {
      licenseErrorMessage();
      process.exit(1);
    }

    throw error;
  }
}

const versionLine = run('xcodebuild -version').split('\n')[0];
console.log(`Using ${versionLine}`);
