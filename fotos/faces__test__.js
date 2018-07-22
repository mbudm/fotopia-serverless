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

const mockFaceMatcher = (originalId) => {
  const existingFaces = existingPeople.reduce((accum, person) => accum.concat(person.faces), []);
  return new Promise(res => res({
    FaceMatches: existingFaces.map(face => ({
      Face: {
        ExternalImageId: face.ExternalImageId,
        FaceId: face.FaceId,
      },
      Similarity: originalId === face.FaceId ? 100 : 0,
    })),
    SearchedFaceId: originalId,
  }));
};

test('getNewImageRecords', (t) => {
  const result = faces.getNewImageRecords(records);
  t.equal(result.length, 1, 'getPeopleForFace length should be 1');
  t.equal(result[0].img_thumb_key, records[0].dynamodb.NewImage.img_thumb_key.S, 'matches the thumb key of the inserted record');
  t.end();
});

test('mockFaceMatcher', (t) => {
  const newImage = faces.getNewImageRecords(records);
  const face = newImage[0].faces[0];
  mockFaceMatcher(face.Face.FaceId)
    .then(({ FaceMatches }) => {
      t.ok(FaceMatches
        .find(f => f.Face.FaceId === face.Face.FaceId && f.Similarity === 100), 'face matches');
      t.end();
    });
});

test('getSimilarityAggregate', (t) => {
  const person = {
    faces: [{
      FaceId: 123,
    },
    {
      FaceId: 456,
    },
    {
      FaceId: 789,
    }],
  };
  const faceMatches = [{
    Face: {
      FaceId: 123,
    },
    Similarity: 100,
  }, {
    Face: {
      FaceId: 456,
    },
    Similarity: 50,
  }, {
    Face: {
      FaceId: 987,
    },
    Similarity: 34,
  }];
  const result = faces.getSimilarityAggregate(person, faceMatches);
  t.equal(result, 50, 'similarity is 50 because unmatched face is discounted');
  t.end();
});


test('getPeopleForFace', (t) => {
  const people = [{
    id: 'bob',
    faces: [{
      FaceId: 123,
    },
    {
      FaceId: 456,
    },
    {
      FaceId: 789,
    }],
  }, {
    id: 'vera',
    faces: [{
      FaceId: 987,
    },
    {
      FaceId: 456,
    }],
  }];
  const faceMatches = [{
    Face: {
      FaceId: 123,
    },
    Similarity: 100,
  }, {
    Face: {
      FaceId: 456,
    },
    Similarity: 50,
  }, {
    Face: {
      FaceId: 987,
    },
    Similarity: 20,
  }];

  const assert = [{
    Person: people[0].id,
    Match: 50,
  }, {
    Person: people[1].id,
    Match: 35, // (50 + 20 + 0 /3)
  }];
  const result = faces.getPeopleForFace(people, faceMatches);
  t.deepEqual(result, assert, 'getPeopleForFace deepequal');
  t.end();
});

test('getPeopleForFaces', (t) => {
  try {
    faces.getPeopleForFaces(faces.getNewImageRecords(records), existingPeople, mockFaceMatcher)
      .then((res) => {
        t.equal(res.length, 2);
        t.equal(res[0].FaceId, 'def');
        t.equal(res[0].People.length, 2);
        t.equal(res[0].People[0].Person, 'abc');
        t.equal(res[0].People[0].Match, 50, 'match 50 for person 0 (1 of 2 faces match)');
        t.equal(res[1].FaceId, 'zab');
        t.equal(res[1].People[0].Match, 0);
        t.end();
      });
  } catch (e) {
    t.fail(e);
  }
});
/*
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

      t.equal(result[0].faces.length, existingPeople[0].faces.length + 1, 'add face to oren');
      const idForInsertedRecord = result[0].faces
        .find(face => face.ExternalImageId === records[0].dynamodb.Keys.id.S)
      t.ok(, 'should find the id for the inserted record');
      t.equal(result.length, existingPeople.length + 1, 'add a new person for the unmatched face');
      t.end();
    });
});
*/
