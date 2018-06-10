
import Sharp from 'sharp';
import createS3Client from './lib/s3';

let s3;

export const THUMB_SUFFIX = '-thumbnail';
export const THUMB_WIDTH = 80;
export const THUMB_HEIGHT = 80;

export function getObject(Bucket, Key) {
  console.log('getObject', Bucket, Key);
  return s3.getObject({ Bucket, Key }).promise();
}

export function createThumbKey(key) {
  const keySplit = key.split('.');
  const ext = keySplit[keySplit.length - 1];
  return `${key.substr(0, key.lastIndexOf(ext) - 1)}${THUMB_SUFFIX}.${ext}`;
}

export function putObject({
  buffer, bucket, key,
}) {
  const thumbKey = createThumbKey(key);
  return s3.putObject({
    Body: buffer,
    Bucket: bucket,
    ContentType: 'image/png',
    Key: thumbKey,
  }).promise();
}

export function resize({ data }) {
  return Sharp(data.Body)
    .resize(THUMB_WIDTH, THUMB_HEIGHT)
    .background({
      r: 255, g: 255, b: 255, alpha: 0,
    })
    .embed()
    .toFormat('png')
    .toBuffer();
}

export function resizeAndUpload({
  data, bucket, key,
}) {
  return resize({ data })
    .then(buffer => putObject({
      buffer, bucket, key,
    }));
}

export function isValidThumbnailCandidate(key, bucket) {
  return key && !key.includes(THUMB_SUFFIX) && !!bucket;
}

export async function createThumb(event) {
  s3 = createS3Client();
  const record = event.Records[0].s3;
  const { key } = record.object;
  const sourceBucket = record.bucket.name;
  const destBucket = sourceBucket;
  console.log('thumbs', record, key, sourceBucket, destBucket);
  try {
    if (!isValidThumbnailCandidate(key, sourceBucket)) {
      console.log('No thumbnail process for ', key, sourceBucket);
      return;
    }
    const data = await getObject(sourceBucket, key);
    console.log('data', data);
    const result = await resizeAndUpload({ data, bucket: destBucket, key });
    console.log('result', result);
  } catch (e) {
    console.error('thumbs error:', key, sourceBucket, destBucket);
  }
}
