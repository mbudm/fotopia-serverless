import AWS from 'aws-sdk';
import serverlessEnv from '../../serverlessEnv';

const serverlessEnvConfig = serverlessEnv.config();

export default function upload(key, object, options) {
  return new Promise((resolve, reject) => {
    console.log('serverlessEnvConfig', serverlessEnvConfig);
    const s3config = {
      s3ForcePathStyle: true,
      endpoint: new AWS.Endpoint(serverlessEnvConfig.LOCAL_TEST_DOMAIN),
    };
    const client = new AWS.S3(s3config);

    const params = {
      Key: key,
      Bucket: serverlessEnvConfig.LOCAL_TEST_BUCKET,
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
}
