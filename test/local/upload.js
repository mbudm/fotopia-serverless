import AWS from 'aws-sdk';

export default function upload(key, object, options) {
  return new Promise((resolve, reject) => {
    const s3config = {
      s3ForcePathStyle: true,
      endpoint: new AWS.Endpoint(process.env.LOCAL_TEST_DOMAIN),
    };
    const client = new AWS.S3(s3config);

    const params = {
      Key: key,
      Bucket: process.env.LOCAL_TEST_BUCKET,
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
