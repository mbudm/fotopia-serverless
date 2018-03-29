import AWS from 'aws-sdk';

export default function uploadLocal(key, object, options) {
  return new Promise((resolve, reject) => {
    const s3config = {
      s3ForcePathStyle: true,
      endpoint: new AWS.Endpoint('http://localhost:5000'),
    };
    const client = new AWS.S3(s3config);

    const params = {
      Key: key,
      Bucket: 'fotopia-web-app-prod',
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
