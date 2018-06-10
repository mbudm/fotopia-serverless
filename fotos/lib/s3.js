import AWS from 'aws-sdk';

export default function createS3Client() {
  let options = {};

  // connect to local s3 if running offline
  if (process.env.IS_OFFLINE) {
    if (process.env.AWS_DEBUG) {
      AWS.config.logger = console;
    }
    options = {
      s3ForcePathStyle: true,
      endpoint: new AWS.Endpoint('http://localhost:5000'),
    };
  }
  console.log('creating s3 client w options: ', options);
  return new AWS.S3(options);
}
