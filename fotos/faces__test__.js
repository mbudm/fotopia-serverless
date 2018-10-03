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
      img_key: {
        S: 'someuser/three.jpg',
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
  thumbnail: 'people/somekey.jpg',
  userIdentityId: 'some-str',
  faces: [{
    FaceId: uuids.someUserImageOneFaceOne,
    ExternalImageId: uuid.v1(),
  }, {
    FaceId: uuids.orenFaceTwo,
    ExternalImageId: uuid.v1(),
  }],
}, {
  name: '',
  id: uuids.personTwo,
  thumbnail: 'people/someotherkey.jpg',
  userIdentityId: 'some-str',
  faces: [{
    FaceId: uuids.personTwoFaceOne,
    ExternalImageId: uuid.v1(),
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
  t.equal(result[0].img_key, records[0].dynamodb.NewImage.img_key.S, 'matches the img key of the inserted record');
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
    FaceId: uuid.v1(),
    ExternalImageId: uuid.v1(),
    img_key: 'some.jpg',
    People: [{
      Person: 'fred',
      Match: 23,
    }],
  }, {
    FaceId: uuid.v1(),
    ExternalImageId: uuid.v1(),
    img_key: 'some.jpg',
    People: [{
      Person: 'ginger',
      Match: 85,
    }],
  }];
  const result = faces.getNewPeople(facesWithMatchedPeople);
  t.equal(result.length, 1);
  t.equal(result[0].faces[0].FaceId, facesWithMatchedPeople[0].FaceId);
  t.end();
});

test('getNewPeople - thumbnailBoundingBox', (t) => {
  const facesWithMatchedPeople = [{
    ExternalImageId: '50925d60-c474-11e8-9af4-75858744cb8b',
    FaceId: 'aafb9f96-14bb-47ac-92c4-427d0a73b039',
    FaceMatches: [{
      Face: {
        BoundingBox: {
          Height: 0.1976570039987564,
          Left: 0.4599609971046448,
          Top: 0.14494900405406952,
          Width: 0.13085900247097015,
        },
        Confidence: 99.99979400634766,
        ExternalImageId: 'a8dd4440-c46e-11e8-a3d9-4b2671790ad7',
        FaceId: '2423c8f4-04f5-44de-88a2-f0cbd4726883',
        ImageId: '050a0025-64b9-56e7-92a8-82ab869aeb10',
      },
      Similarity: 100,
    }],
    People: [],
    img_key: 'tester/test/mock/large_colour_face_parsing_error.jpg',
    userIdentityId: 'us-east-1:744efc36-bb66-4514-b30c-b7f1085de233',
    BoundingBox: {
      Height: 0.1976570039987564,
      Left: 0.4599609971046448,
      Top: 0.14494900405406952,
      Width: 0.13085900247097015,
    },
  }];
  const result = faces.getNewPeople(facesWithMatchedPeople);
  t.equal(result.length, 1);
  t.deepEqual(result[0].boundingBox, facesWithMatchedPeople[0].BoundingBox);
  t.end();
});


test('getFacesThatMatchThisPerson', (t) => {
  const person = {
    id: uuid.v1(),
  };
  const facesWithMatchedPeople = [{
    FaceId: uuid.v1(),
    ExternalImageId: uuid.v1(),
    People: [{
      Person: person.id,
      Match: 23,
    }],
  }, {
    FaceId: uuid.v1(),
    ExternalImageId: uuid.v1(),
    People: [{
      Person: person.id,
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
    id: uuid.v1(),
    thumbnail: 'some.jpg',
    userIdentityId: 'some-str',
    faces: [{
      FaceId: uuid.v1(),
      ExternalImageId: uuid.v1(),
    }],
  }, {
    id: uuid.v1(),
    thumbnail: 'some.jpg',
    userIdentityId: 'some-str',
    faces: [{
      FaceId: uuid.v1(),
      ExternalImageId: uuid.v1(),
    }],
  }];
  const facesWithMatchedPeople = [{
    FaceId: uuid.v1(),
    ExternalImageId: uuid.v1(),
    img_key: 'one.jpg',
    People: [{
      Person: people[0].id,
      Match: 23,
    }],
  }, {
    FaceId: uuid.v1(),
    ExternalImageId: uuid.v1(),
    img_key: 'one.jpg',
    People: [{
      Person: people[0].id,
      Match: 85,
    }],
  }];
  const newPeople = faces.getNewPeople(facesWithMatchedPeople);
  const result = faces.getUpdatedPeople(people, facesWithMatchedPeople, newPeople);
  t.equal(result[0].faces.length, 2, 'add face to person 1');
  t.equal(result[0].faces[1].FaceId, facesWithMatchedPeople[1].FaceId, 'should find the id for the inserted record');
  t.equal(result.length, people.length + 1, 'add a new person for the unmatched face');
  t.equal(result[2].name, '', 'new person has an empty name field');
  t.equal(result[2].faces[0].FaceId, facesWithMatchedPeople[0].FaceId, 'face with low person 1 match is key face for new person');
  t.end();
});


test('getUpdatedPeople - new person with no matching faces', (t) => {
  const people = [];
  const facesWithMatchedPeople = [{
    FaceId: uuid.v1(),
    ExternalImageId: uuid.v1(),
    img_key: 'one.jpg',
    People: [],
  }];
  const newPeople = faces.getNewPeople(facesWithMatchedPeople);
  const result = faces.getUpdatedPeople(people, facesWithMatchedPeople, newPeople);
  t.equal(result.length, 1, 'add a new person for the unmatched face');
  t.equal(result[0].name, '', 'new person has an empty name field');
  t.equal(result[0].faces[0].FaceId, facesWithMatchedPeople[0].FaceId, 'face with no people matches is key face for new person');
  t.end();
});

test('getUpdatedPeople - no faces detected in image', (t) => {
  const people = [{
    id: uuid.v1(),
    thumbnail: 'some.jpg',
    userIdentityId: 'some-str',
    faces: [{
      FaceId: uuid.v1(),
      ExternalImageId: uuid.v1(),
    }],
  }, {
    id: uuid.v1(),
    thumbnail: 'some.jpg',
    userIdentityId: 'some-str',
    faces: [{
      FaceId: uuid.v1(),
      ExternalImageId: uuid.v1(),
    }],
  }];
  const facesWithMatchedPeople = [];
  const result = faces.getUpdatedPeople(people, facesWithMatchedPeople, []);
  t.equal(result.length, 2, 'no peeps added');
  t.equal(result[0].faces.length, 1, 'no faces added');
  t.end();
});

test('getUpdateBody - no people', (t) => {
  const newImageRecords = faces.getNewImageRecords(records);
  faces.getPeopleForFaces(newImageRecords, existingPeople, mockFaceMatcher)
    .then((facesWithPeople) => {
      const result = faces.getUpdateBody(facesWithPeople);
      t.equal(result.people.length, 0, 'passes joi validation but has 0 results, as none over threshold');
      t.end();
    })
    .catch(t.fail);
});

test('getUpdateBody - unique people', (t) => {
  const person = {
    id: uuid.v1(),
  };
  const facesWithPeople = [];
  const newPeople = [{
    id: person.id,
  }, {
    id: person.id,
  }];
  const result = faces.getUpdateBody(facesWithPeople, newPeople);
  t.equal(result.people.length, 1);
  t.deepEqual(result.people, [person.id], 'dedupes person ids');
  t.end();
});

test('getUpdateBody - has matches with existing people', (t) => {
  const person = {
    id: uuid.v1(),
  };
  const facesWithPeople = [{
    FaceId: uuid.v1(),
    ExternalImageId: uuid.v1(),
    People: [{
      Person: person.id,
      Match: 23,
    }],
    FaceMatches: [{
      Face: {
        ExternalImageId: uuid.v1(),
        FaceId: uuid.v1(),
      },
      Similarity: 45,
    }],
  }, {
    FaceId: uuid.v1(),
    ExternalImageId: uuid.v1(),
    People: [{
      Person: person.id,
      Match: 85,
    }],
    FaceMatches: [{
      Face: {
        ExternalImageId: uuid.v1(),
        FaceId: uuid.v1(),
      },
      Similarity: 85,
    }],
  }];
  const result = faces.getUpdateBody(facesWithPeople);
  t.deepEqual(result.people, [person.id], 'passes joi validation and 1 results, as one face is over threshold');
  t.end();
});


test('getUpdateBody - has matches with a new person but none with existing people', (t) => {
  const person = {
    id: uuid.v1(),
  };
  const facesWithPeople = [{
    FaceId: uuid.v1(),
    ExternalImageId: uuid.v1(),
    People: [{
      Person: person.id,
      Match: 23,
    }],
    FaceMatches: [{
      Face: {
        ExternalImageId: uuid.v1(),
        FaceId: uuid.v1(),
      },
      Similarity: 45,
    }],
  }];
  const newPeople = [{
    id: uuid.v1(),
  }];
  const result = faces.getUpdateBody(facesWithPeople, newPeople);
  t.deepEqual(result.people, [newPeople[0].id], 'passes joi validation and 1 results, as one face is new');
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
