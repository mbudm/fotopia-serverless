import test from 'tape';
import * as uploaded from './uploaded';

test('getInvokeCreateParams', (t) => {
  const req = { someProp: 'blah' };
  const res = uploaded.getInvokeCreateParams(req);
  t.deepEqual(JSON.parse(res.Payload).pathParameters, req);
  t.end();
});

// test('createPathParams', (t) => {
//   const event = {
//     Records: [{
//       s3: {
//         bucket: {
//           name: 'yo-yo-bucket',
//         },
//         object: {
//           key: 'meh/mah-object',
//         },
//       },
//     }],
//   };
//   const res = uploaded.createPathParams(event);
//   t.equal(res.username, 'meh');
//   t.equal(res.key, event.Records[0].s3.object.key);
//   t.ok(res.location.includes(res.key));
//   t.end();
// });

test('addImageMetaDataToPathParams', (t) => {
  const params = { username: 'blah' };
  const meta = {
    exif: {
      DateTimeOriginal: new Date().getTime(),
    },
  };
  const res = uploaded.addImageMetaDataToPathParams(params, meta);
  t.equal(res.birthtime, new Date(meta.exif.DateTimeOriginal).toISOString());
  t.end();
});
