const dotEnv = require('dotenv');

dotEnv.config();

module.exports.config = () => {
  const devCustomDomain = process.env.CUSTOM_DOMAIN_DEV;
  const prodCustomDomain = process.env.CUSTOM_DOMAIN_PROD;
  const alphaCustomDomain = process.env.CUSTOM_DOMAIN_ALPHA;
  const fotopiaGroup = process.env.FOTOPIA_GROUP;
  const nameSpace = process.env.NAME_SPACE;
  return {
    dev: {
      CUSTOM_DOMAIN: devCustomDomain || 'none',
      USE_CUSTOM_DOMAIN: !!devCustomDomain,
    },
    prod: {
      CUSTOM_DOMAIN: prodCustomDomain || 'none',
      USE_CUSTOM_DOMAIN: !!prodCustomDomain,
    },
    alpha: {
      CUSTOM_DOMAIN: alphaCustomDomain || 'none',
      USE_CUSTOM_DOMAIN: !!alphaCustomDomain,
    },
    FOTOPIA_GROUP: fotopiaGroup || 'none',
    NAME_SPACE: nameSpace || 'none',
  };
};
