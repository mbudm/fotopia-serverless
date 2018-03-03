
import s3 from './lib/s3';
import { success, failure } from './lib/responses';

const offlineConfig = {
  UserPoolId: 'us-east-1_FaKe12345',
  UserPoolClientId: 'FakeUserPoolClientId',
  IdentityPoolId: 'FakeIdentityPoolId',
  Region: 'us-east-1',
};

export function getS3Params() {
  const Bucket = process.env.S3_OUTPUT_BUCKET;
  const Key = process.env.S3_OUTPUT_FILENAME;
  console.log('getS3Params', Bucket, Key);
  return {
    Bucket,
    Key,
  };
}

export async function getItem(event, context, callback) {
  if (process.env.IS_OFFLINE) {
    return callback(null, success(offlineConfig));
  }
  const s3Params = getS3Params();
  try {
    const s3Object = await s3.getObject(s3Params).promise();
    const parsedBuffer = JSON.parse(s3Object.Body.toString());
    return callback(null, success(parsedBuffer));
  } catch (err) {
    console.error(err, s3Params);
    return callback(null, failure(err));
  }
}
