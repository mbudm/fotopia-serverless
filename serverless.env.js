const fs = require('fs');
const dotEnv = require('dotenv');

dotEnv.config();

const filePath = './serverless.env.yml';

function writeFile(str) {
  return new Promise((resolve, reject) => {
    try {
      fs.writeFile(filePath, str, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(filePath);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

function createFile() {
  const devCustomDomain = process.env.CUSTOM_DOMAIN_DEV;
  const prodCustomDomain = process.env.CUSTOM_DOMAIN_PROD;
  const alphaCustomDomain = process.env.CUSTOM_DOMAIN_ALPHA;
  const fotopiaGroup = process.env.FOTOPIA_GROUP;
  const nameSpace = process.env.NAME_SPACE;
  return `dev:
  CUSTOM_DOMAIN: ${devCustomDomain || 'none'}
  USE_CUSTOM_DOMAIN: ${!!devCustomDomain}
prod:
  CUSTOM_DOMAIN: ${prodCustomDomain || 'none'}
  USE_CUSTOM_DOMAIN: ${!!prodCustomDomain}
alpha:
  CUSTOM_DOMAIN: ${alphaCustomDomain || 'none'}
  USE_CUSTOM_DOMAIN: ${!!alphaCustomDomain}
FOTOPIA_GROUP: ${fotopiaGroup || 'none'}
NAME_SPACE: ${nameSpace || 'none'}`;
}

const blob = createFile();
writeFile(blob)
  .then(result => console.log('success', result));
