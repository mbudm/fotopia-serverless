import test from 'tape';
import * as s3 from './s3';

test('GetObjectError', (t) => {
  const bucket = 's3Bucket';
  const key = 's3Key';
  const e = new Error('S3 native error');
  e.code = 'S3NativeCode';
  try {
    throw new s3.GetObjectError(e, key, bucket);
  } catch (err) {
    t.equal(err.code, e.code);
    t.equal(err.message, 'GetObjectError: S3 native error key: s3Key, bucket: s3Bucket');
    t.end();
  }
});
