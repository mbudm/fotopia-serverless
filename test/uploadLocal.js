const AWS = require('aws-sdk');
const config = require('../output/config.json');

module.exports = function uploadLocal(key, object, options) {
  return new Promise((resolve, reject) => {
    const s3config = {
      s3ForcePathStyle: true,
      endpoint: new AWS.Endpoint('http://localhost:5000'),
    };
    const client = new AWS.S3(s3config);

    const params = {
      Key: key,
      Bucket: config.Bucket,
      Body: object,
      ...options,
    };

    client.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};
