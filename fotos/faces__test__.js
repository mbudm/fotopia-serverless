import test from 'tape';
import uuid from 'uuid';

import * as faces from './faces';

const uuids = {
  someUserImageOne: uuid.v1(),
  someUserImageOneFaceOne: uuid.v1(),
  someUserImageOneFaceTwo: uuid.v1(),
  oren: uuid.v1(),
  orenFaceTwo: uuid.v1(),
  personTwo: uuid.v1(),
  personTwoFaceOne: uuid.v1(),
};
const records = [{
  eventName: 'INSERT',
  dynamodb: {
    ApproximateCreationDateTime: 1529636100,
    Keys: {
      id: {
        S: uuids.someUserImageOne,
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
                ExternalImageId: { S: uuids.someUserImageOne },
                FaceId: { S: uuids.someUserImageOneFaceOne },
              },
            },
          },
        }, {
          M: {
            Face: {
              M: {
                ExternalImageId: { S: uuids.someUserImageOne },
                FaceId: { S: uuids.someUserImageOneFaceTwo },
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
      birthtime: {
        N: 454654654,
      },
      group: {
        S: 'mygroup',
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
  id: uuids.oren,
  keyFaceId: uuids.someUserImageOneFaceOne,
  faces: [{
    FaceId: uuids.someUserImageOneFaceOne,
    ExternalImageId: uuid.v1(),
    img_thumb_key: 'otheruser/two-thumbnail.jpg',
    userIdentityId: 'yada',
  }, {
    FaceId: uuids.orenFaceTwo,
    ExternalImageId: uuid.v1(),
    img_thumb_key: 'someuser/one-thumbnail.jpg',
    userIdentityId: 'yadayada',
    People: [{
      Person: uuids.oren,
      Match: 99.8944320678711,
    }],
    FaceMatches: [{ someProp: 999 }],
  }],
}, {
  name: '',
  id: uuids.personTwo,
  keyFaceId: uuids.personTwoFaceOne,
  faces: [{
    FaceId: uuids.personTwoFaceOne,
    ExternalImageId: uuid.v1(),
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

test('getExistingPeople', (t) => {
  const s3 = {
    getObject: () => ({
      promise: () => new Promise(res => res({
        Body: JSON.stringify(existingPeople),
      })),
    }),
  };
  try {
    faces.getExistingPeople(s3, 'bucket', 'key')
      .then((result) => {
        t.deepEqual(result, existingPeople, 'passes joi validation for peopleSchema');
        t.end();
      });
  } catch (e) {
    t.fail(e);
  }
});

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
        t.equal(res[0].FaceId, uuids.someUserImageOneFaceOne);
        t.equal(res[0].People.length, 2);
        t.equal(res[0].People[0].Person, uuids.oren);
        t.equal(res[0].People[0].Match, 50, 'match 50 for person 0 (1 of 2 faces match)');
        t.equal(res[1].FaceId, uuids.someUserImageOneFaceTwo);
        t.equal(res[1].People[0].Match, 0);
        t.end();
      });
  } catch (e) {
    t.fail(e);
  }
});

test('getNewPeople - faces that don\'t match an existing person', (t) => {
  const facesWithMatchedPeople = [{
    FaceId: 'face1',
    People: [{
      Person: 'fred',
      Match: 23,
    }],
  }, {
    FaceId: 'face2',
    People: [{
      Person: 'ginger',
      Match: 85,
    }],
  }];
  const result = faces.getNewPeople(facesWithMatchedPeople);
  t.equal(result.length, 1);
  t.equal(result[0].keyFaceId, 'face1');
  t.end();
});


test('getFacesThatMatchThisPerson', (t) => {
  const person = {
    id: 'ginger',
  };
  const facesWithMatchedPeople = [{
    FaceId: 'face1',
    People: [{
      Person: 'ginger',
      Match: 23,
    }],
  }, {
    FaceId: 'face2',
    People: [{
      Person: 'ginger',
      Match: 85,
    }],
  }];
  const result = faces.getFacesThatMatchThisPerson(person, facesWithMatchedPeople);
  t.equal(result.length, 1);
  t.equal(result[0].FaceId, facesWithMatchedPeople[1].FaceId);
  t.end();
});

test('getUpdatedPeople', (t) => {
  const people = [{
    id: 'ginger',
    faces: [{
      FaceId: 'face0',
    }],
  }, {
    id: 'fred',
    faces: [{
      FaceId: 'face99',
    }],
  }];
  const facesWithMatchedPeople = [{
    FaceId: 'face1',
    People: [{
      Person: 'ginger',
      Match: 23,
    }],
  }, {
    FaceId: 'face2',
    People: [{
      Person: 'ginger',
      Match: 85,
    }],
  }];
  const result = faces.getUpdatedPeople(people, facesWithMatchedPeople);
  t.equal(result[0].faces.length, 2, 'add face to ginger');
  t.equal(result[0].faces[1].FaceId, facesWithMatchedPeople[1].FaceId, 'should find the id for the inserted record');
  t.equal(result.length, people.length + 1, 'add a new person for the unmatched face');
  t.equal(result[2].name, '', 'new person has an empty name field');
  t.equal(result[2].keyFaceId, facesWithMatchedPeople[0].FaceId, 'face with low ginger match is key face for new person');
  t.end();
});


test('getUpdatedPeople - new person with no matching faces', (t) => {
  const people = [];
  const facesWithMatchedPeople = [{
    FaceId: 'face1',
    People: [],
  }];
  const result = faces.getUpdatedPeople(people, facesWithMatchedPeople);
  t.equal(result.length, 1, 'add a new person for the unmatched face');
  t.equal(result[0].name, '', 'new person has an empty name field');
  t.equal(result[0].keyFaceId, facesWithMatchedPeople[0].FaceId, 'face with no people matches is key face for new person');
  t.end();
});

test('getUpdateBody - no people', (t) => {
  const newImageRecords = faces.getNewImageRecords(records);
  faces.getPeopleForFaces(newImageRecords, existingPeople, mockFaceMatcher)
    .then((facesWithPeople) => {
      const result = faces.getUpdateBody(facesWithPeople);
      t.deepEqual(result.people.length, 0, 'passes joi validation but has 0 results, as none over threshold');
      t.end();
    });
});

test('getUpdateBody - has people', (t) => {
  const facesWithPeople = [{
    FaceId: 'face1',
    People: [{
      Person: 'ginger',
      Match: 23,
    }],
  }, {
    FaceId: 'face2',
    People: [{
      Person: 'ginger',
      Match: 85,
    }],
  }];
  const result = faces.getUpdateBody(facesWithPeople);
  t.deepEqual(result.people, ['ginger'], 'passes joi validation and 1 results, as one face is over threshold');
  t.end();
});

test('getUpdatePathParameters', (t) => {
  const newImageRecords = [{
    id: uuid.v1(),
    username: 'bob',
    birthtime: 34354345,
    tags: [],
  }];
  const result = faces.getUpdatePathParameters(newImageRecords);
  t.equal(result.username, 'bob');
  t.end();
});
