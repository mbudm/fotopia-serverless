import test from 'tape';
import * as faces from './faces';

const records = [{
  eventName: 'INSERT',
  dynamodb: {
    ApproximateCreationDateTime: 1529636100,
    Keys: {
      id: {
        S: 'jkl',
      },
      username: {
        S: 'someuser',
      },
    },
    NewImage: {
      faces: {
        L: [{
          M: {
            Face: {
              M: {
                ExternalImageId: { S: 'jkl' },
                FaceId: { S: 'def' },
              },
            },
          },
        }, {
          M: {
            Face: {
              M: {
                ExternalImageId: { S: 'jkl' },
                FaceId: { S: 'zab' },
              },
            },
          },
        }],
      },
      img_thumb_key: {
        S: 'someuser/three-thumbnail.jpg',
      },
      userIdentityId: {
        S: 'us-east-1:7261e973-d20d-406a-828c-d8cf70fd888e',
      },
    },
  },
}, {
  dynamodb: {
    eventName: 'UPDATE',
    NewImage: {},
    OldImage: {},
  },
}, {
  dynamodb: {
    eventName: 'REMOVE',
    OldImage: {},
  },
}];

const existingPeople = [{
  name: 'Oren',
  id: 'abc',
  keyFaceId: 'def',
  faces: [{
    FaceId: 'def',
    ExternalImageId: 'xyz',
    img_thumb_key: 'otheruser/two-thumbnail.jpg',
    userIdentityId: 'yada',
  }, {
    FaceId: 'ghi',
    ExternalImageId: 'uvw',
    img_thumb_key: 'someuser/one-thumbnail.jpg',
    userIdentityId: 'yadayada',
    compare: [{
      FaceId: 'def',
      Match: 99.8944320678711,
    }],
  }],
}, {
  name: '',
  id: 'mno',
  keyFaceId: 'pqr',
  faces: [{
    FaceId: 'pqr',
    ExternalImageId: 'stu',
    img_thumb_key: 'fred/seven-thumbnail.jpg',
    userIdentityId: 'yabbadabba',
  }],
}];

const mockFaceMatcher = (originalId, compareId) => (originalId === compareId ? 100 : 0);

test('getNewImageRecords', (t) => {
  const result = faces.getNewImageRecords(records);
  t.equal(result.length, 1, 'getPeopleForFace length should be 1');
  t.equal(result[0].img_thumb_key, records[0].dynamodb.NewImage.img_thumb_key.S, 'matches the thumb key of the inserted record');
  t.end();
});

test('getPeopleForFace', (t) => {
  const newImage = faces.getNewImageRecords(records);
  const face = newImage[0].faces[0];

  const assert = [{
    Person: existingPeople[0].id,
    Match: 100,
  }, {
    Person: existingPeople[1].id,
    Match: 0,
  }];
  try {
    faces.getPeopleForFace(face.Face.FaceId, existingPeople, mockFaceMatcher)
      .then((res) => {
        t.deepEqual(res, assert, 'getPeopleForFace deepequal');
        t.end();
      });
  } catch (e) {
    t.fail(e);
  }
});

test('getPeopleForFaces', (t) => {
  try {
    faces.getPeopleForFaces(faces.getNewImageRecords(records), existingPeople, mockFaceMatcher)
      .then((res) => {
        t.equal(res.length, 2);
        t.equal(res[0].FaceId, 'def');
        t.equal(res[0].People.length, 2);
        t.equal(res[0].People[0].Person, 'abc');
        t.equal(res[0].People[0].Match, 100);
        t.equal(res[1].FaceId, 'zab');
        t.equal(res[1].People[0].Match, 0);
        // t.deepEqual(res, []);
        t.end();
      });
  } catch (e) {
    t.fail(e);
  }
});

test('getNewPeople', (t) => {
  faces.getPeopleForFaces(faces.getNewImageRecords(records), existingPeople, mockFaceMatcher)
    .then((facesWithPeople) => {
      const result = faces.getNewPeople(facesWithPeople);
      t.equal(result.length, 1);
      t.equal(result[0].keyFaceId, 'zab');
      t.end();
    });
});

test('getUpdatedPeople', (t) => {
  faces.getPeopleForFaces(faces.getNewImageRecords(records), existingPeople, mockFaceMatcher)
    .then((facesWithPeople) => {
      const result = faces.getUpdatedPeople(existingPeople, facesWithPeople);

      t.equal(result[0].faces.length, existingPeople[0].faces.length + 1, 'add another face to oren');
      t.ok(result[0].faces.find(face => face.ExternalImageId === records[0].dynamodb.Keys.id.S), 'should find the id for the inserted record');
      t.equal(result.length, existingPeople.length + 1, 'add a new person for the unmatched face');
      t.end();
    });
});
