import test from 'tape';
import * as thumbs from './thumbs';

test('createThumbKey - safe filename', (t) => {
  const key = 'username/somefile.jpg';
  const thumbKey = `username/somefile${thumbs.THUMB_SUFFIX}.jpg`;
  const result = thumbs.createThumbKey(key);
  t.equal(thumbKey, result);
  t.end();
});

test('createThumbKey - filename extra dots', (t) => {
  const key = 'user.name/some.file.jpg';
  const thumbKey = `user.name/some.file${thumbs.THUMB_SUFFIX}.jpg`;
  const result = thumbs.createThumbKey(key);
  t.equal(thumbKey, result);
  t.end();
});

test('isValidThumbnailCandidate - no thumbnail suffix', (t) => {
  const key = 'user.name/some.file.jpg';
  const bucket = 'valid-bucket-name';
  const result = thumbs.isValidThumbnailCandidate(key, bucket);
  t.equal(result, true);
  t.end();
});

test('isValidThumbnailCandidate - has thumbnail suffix in right location', (t) => {
  const key = `user.name/some.file${thumbs.THUMB_SUFFIX}.jpg`;
  const bucket = 'valid-bucket-name';
  const result = thumbs.isValidThumbnailCandidate(key, bucket);
  t.equal(result, false);
  t.end();
});

test('isValidThumbnailCandidate - has thumbnail suffix in odd location', (t) => {
  const key = `user.name${thumbs.THUMB_SUFFIX}/some.file.jpg`;
  const bucket = 'valid-bucket-name';
  const result = thumbs.isValidThumbnailCandidate(key, bucket);
  t.equal(result, false);
  t.end();
});

test('isValidThumbnailCandidate - has multiple thumbnail suffixes', (t) => {
  const key = `user.name/some.file${thumbs.THUMB_SUFFIX}${thumbs.THUMB_SUFFIX}.jpg`;
  const bucket = 'valid-bucket-name';
  const result = thumbs.isValidThumbnailCandidate(key, bucket);
  t.equal(result, false);
  t.end();
});

test('isValidThumbnailCandidate - invalid bucket', (t) => {
  const key = `user.name${thumbs.THUMB_SUFFIX}/some.file.jpg`;
  const result = thumbs.isValidThumbnailCandidate(key);
  t.equal(result, false);
  t.end();
});
