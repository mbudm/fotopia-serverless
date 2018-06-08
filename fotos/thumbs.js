
import Sharp from 'sharp';
import s3 from './lib/s3';

const {
  S3_BUCKET,
} = process.env;
const SIZES = [
  [80, 80],
  [160, 200],
  [600, 400],
].map(sizes => ({
  width: sizes[0],
  height: sizes[1],
}));

export function getObject(key) {
  return s3.getObject({ Bucket: S3_BUCKET, Key: key }).promise();
}

export function putObject({
  buffer, key, width, height,
}) {
  return s3.putObject({
    Body: buffer,
    Bucket: S3_BUCKET,
    ContentType: 'image/png',
    Key: `${width}x${height}/${key}`,
  }).promise();
}

export function resize({ data, width, height }) {
  return Sharp(data.Body)
    .resize(width, height)
    .background({
      r: 255, g: 255, b: 255, alpha: 0,
    })
    .embed()
    .toFormat('png')
    .toBuffer();
}

export function resizeAndUpload({
  data, width, height, key,
}) {
  return resize({ data, width, height })
    .then(buffer => putObject({
      buffer, key, width, height,
    }));
}

export function resizeAndUploadSizes({ data, key }) {
  return Promise.all(SIZES.map(({ width, height }) => resizeAndUpload({
    width, height, data, key,
  })));
}

export async function createThumb(event) {
  const record = event.Records[0].s3;
  const { key } = record.object;
  console.log('thumbs', record, key);
  try {
    const data = await getObject(key);
    const result = await resizeAndUploadSizes({ data, key });
    console.log(result);
  } catch (e) {
    console.error('thumbs error:', e);
  }
}
