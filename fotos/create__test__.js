import test from 'tape';
import uuid from 'uuid';
import * as create from './create';

const username = 'jethro';

const requestBody = {
  username,
  userIdentityId: username,
  birthtime: 123,
  people: ['Bob'],
  tags: [],
  img_key: `${username}/me.jpg`,
};

const recordId = uuid.v1();

const fotopiaGroup = 'my-group';

test('validateRequest', (t) => {
  try {
    const result = create.validateRequest(JSON.stringify(requestBody));
    t.deepEqual(result, requestBody);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

test('createThumbKey - safe filename', (t) => {
  const key = 'username/somefile.jpg';
  const thumbKey = `username/somefile${create.THUMB_SUFFIX}.jpg`;
  const result = create.createThumbKey(key);
  t.equal(thumbKey, result);
  t.end();
});

test('createThumbKey - filename extra dots', (t) => {
  const key = 'user.name/some.file.jpg';
  const thumbKey = `user.name/some.file${create.THUMB_SUFFIX}.jpg`;
  const result = create.createThumbKey(key);
  t.equal(thumbKey, result);
  t.end();
});

test('getDynamoDbParams', (t) => {
  process.env.DYNAMODB_TABLE = 'TABLE';
  try {
    const params = create.getDynamoDbParams(requestBody, recordId, fotopiaGroup);
    t.deepEqual(params.Item.username, requestBody.username);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

test('getPeopleFromRekognitionFaces', (t) => {
  const faces = {
    FaceRecords: [
      {
        Face: {
          FaceId: 'f81bb045-9d24-4d0b-a928-b0267cbbd7c6',
        },
      },
      {
        Face: {
          FaceId: '8b637e73-da25-4a2e-8e21-2cea38217fd6',
        },
      },
    ],
    FaceModelVersion: '3.0',
  };
  const result = create.getPeopleFromRekognitionFaces(faces);
  t.equal(result.length, 2);
  t.equal(result[0], faces.FaceRecords[0].Face.FaceId);
  t.end();
});

test('getTagsFromRekognitionLabels', (t) => {
  const labels = {
    Labels: [
      {
        Name: 'Human',
        Confidence: 99.29840850830078,
      },
      {
        Name: 'People',
        Confidence: 99.29840850830078,
      },
      {
        Name: 'Person',
        Confidence: 99.29840850830078,
      },
      {
        Name: 'Face',
        Confidence: 89.55351257324219,
      },
      {
        Name: 'Portrait',
        Confidence: 89.55351257324219,
      },
    ],
  };
  const result = create.getTagsFromRekognitionLabels(labels);
  t.equal(result.length, 5);
  t.equal(result[0], labels.Labels[0].Name);
  t.end();
});

test('getPeopleFromRekognitionFaces  null arg', (t) => {
  const result = create.getPeopleFromRekognitionFaces();
  t.deepEqual(result, []);
  t.end();
});

test('getTagsFromRekognitionLabels null arg', (t) => {
  const result = create.getTagsFromRekognitionLabels();
  t.deepEqual(result, []);
  t.end();
});

