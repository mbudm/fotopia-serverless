const dotEnv = require('dotenv');

dotEnv.config();

module.exports.config = () => {
  const honeyKey = process.env.HONEY_KEY;
  const logGroupPrefix = process.env.LOG_GROUP_PREFIX;
  return {
    HONEY_KEY: honeyKey, // let it be undefined to trigger a serverless error
    LOG_GROUP_PREFIX: logGroupPrefix || 'none',
  };
};
