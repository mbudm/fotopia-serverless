import AWS from 'aws-sdk';

let options = {};

// connect to local s3 if running offline
if (process.env.IS_OFFLINE) {
  options = {
    s3ForcePathStyle: true,
    endpoint: new AWS.Endpoint('http://localhost:5000'),
  };
}

const s3 = new AWS.S3(options);

export default s3;
