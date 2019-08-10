import { BoundingBox, FaceMatch, FaceMatchList, FaceRecord } from "aws-sdk/clients/rekognition";
import * as test from "tape";
import * as uuid from "uuid";

import * as getExistingPeople from "./common/getExistingPeople";
import * as faces from "./faces";

import {
  IFace,
  IFaceMatcherCallbackResponse,
  IFaceWithPeople,
  IImage,
  IImageDimensions,
  IPerson,
  IPersonMatch,
} from "./types";

const uuids = {
  oren: uuid.v1(),
  orenFaceTwo: uuid.v1(),
  personTwo: uuid.v1(),
  personTwoFaceOne: uuid.v1(),
  someUserImageOne: uuid.v1(),
  someUserImageOneFaceOne: uuid.v1(),
  someUserImageOneFaceTwo: uuid.v1(),
};

const newImage: IImage = {
  birthtime: 454654654,
  createdAt: 454654654,
  faces: [{
    Face: {
      ExternalImageId: uuids.someUserImageOne,
      FaceId: uuids.someUserImageOneFaceOne,
    },
    FaceDetail: {
      Landmarks: [],
    },
  }, {
    Face: {
      ExternalImageId: uuids.someUserImageOne,
      FaceId: uuids.someUserImageOneFaceTwo,
    },
    FaceDetail: {
      Landmarks: [],
    },
  }],
  group: "mygroup",
  id: uuids.someUserImageOne,
  img_key: "someuser/three.jpg",
  meta: {
    height: 480,
    width: 640,
  },
  userIdentityId: "us-east-1:7261e973-d20d-406a-828c-d8cf70fd888e",
  username: "someuser",
};

const boundingBox: BoundingBox =  {
  Height: 0.1976570039987564,
  Left: 0.4599609971046448,
  Top: 0.14494900405406952,
  Width: 0.13085900247097015,
};
const imageDimensions: IImageDimensions = {
  height: 640,
  width: 480,
};

const existingPeople: IPerson[] = [{
  boundingBox: {
    Height: 100,
    Left: 0,
    Top: 0,
    Width: 100,
  },
  faces: [{
    ExternalImageId: uuid.v1(),
    FaceId: uuids.someUserImageOneFaceOne,
  }, {
    ExternalImageId: uuid.v1(),
    FaceId: uuids.orenFaceTwo,
  }],
  id: uuids.oren,
  imageDimensions,
  img_key: "people/somekey.jpg",
  name: "Oren",
  thumbnail: "people/somekey-suffix.jpg",
  userIdentityId: "some-str",
}, {
  boundingBox,
  faces: [{
    ExternalImageId: uuid.v1(),
    FaceId: uuids.personTwoFaceOne,
  }],
  id: uuids.personTwo,
  imageDimensions,
  img_key: "people/someotherkey.jpg",
  name: "",
  thumbnail: "people/someotherkey-suffix.jpg",
  userIdentityId: "some-str",
}];

const mockFaceMatcher = (originalId: string): Promise<IFaceMatcherCallbackResponse> => {
  const existingFaces = existingPeople.reduce((accum, person) => accum.concat(person.faces), new Array<IFace>());
  return new Promise((res) => res({
    FaceMatches: existingFaces.map((face) => ({
      Face: {
        ExternalImageId: face.ExternalImageId,
        FaceId: face.FaceId,
      },
      Similarity: originalId === face.FaceId ? 100 : 0,
    })),
    SearchedFaceId: originalId,
  }));
};

test("getExistingPeople", (t) => {
  const s3 = {
    getObject: () => ({
      promise: () => new Promise((res) => res({
        Body: JSON.stringify(existingPeople),
      })),
    }),
  };
  try {
    getExistingPeople.getExistingPeople(s3, "bucket", "key")
      .then((result) => {
        t.deepEqual(result, existingPeople, "passes joi validation for peopleSchema");
        t.end();
      });
  } catch (e) {
    t.fail(e);
  }
});

test("getNewImageRecords", (t) => {
  const result = faces.getNewImage(JSON.stringify(newImage));
  const insertedRecImgKey: string | undefined = newImage.img_key;
  t.equal(result.img_key, insertedRecImgKey, "matches the img key of the inserted record");
  t.end();
});

test("mockFaceMatcher", (t) => {
  const face: FaceRecord = newImage.faces![0];
  const faceToSearchWith: string = face.Face!.FaceId || "";
  mockFaceMatcher(faceToSearchWith)
    .then(({ FaceMatches }) => {
      t.ok(FaceMatches
        .find((f) => f.Face!.FaceId === faceToSearchWith && f.Similarity === 100), "face matches");
      t.end();
    });
});

test("getSimilarityAggregate", (t) => {
  const person: IPerson = {
    faces: [{
      FaceId: "123",
    },
    {
      FaceId: "456",
    },
    {
      FaceId: "789",
    }],
    id: "yuy",
    imageDimensions,
    img_key: "people/someotherkey.jpg",
    name: "",
    thumbnail: "people/someotherkey-suffix.jpg",
    userIdentityId: "some-str",
  };
  const faceMatches: FaceMatchList = [{
    Face: {
      FaceId: "123",
    },
    Similarity: 100,
  }, {
    Face: {
      FaceId: "456",
    },
    Similarity: 50,
  }, {
    Face: {
      FaceId: "987",
    },
    Similarity: 34,
  }];
  const result = faces.getSimilarityAggregate(person, faceMatches);
  t.equal(result, 50, "similarity is 50 because unmatched face is discounted");
  t.end();
});

test("getPeopleForFace", (t) => {

  const people: IPerson[] = [{
    boundingBox,
    faces: [{
      ExternalImageId: "abc",
      FaceId: "123",
    },
    {
      ExternalImageId: "abc",
      FaceId: "456",
    },
    {
      ExternalImageId: "abc",
      FaceId: "789",
    }],
    id: "bob",
    imageDimensions,
    img_key: "ghgj",
    name: "hjhj",
    thumbnail: "hkjj",
    userIdentityId: "hjghjg",
  }, {
    boundingBox,
    faces: [{
      ExternalImageId: "abc",
      FaceId: "987",
    },
    {
      ExternalImageId: "abc",
      FaceId: "456",
    }],
    id: "vera",
    imageDimensions,
    img_key: "ghgj",
    name: "hjhj",
    thumbnail: "hkjj",
    userIdentityId: "hjghjg",
  }];

  const faceMatches: FaceMatchList = [{
    Face: {
      ExternalImageId: "abc",
      FaceId: "123",
    },
    Similarity: 100,
  }, {
    Face: {
      ExternalImageId: "abc",
      FaceId: "456",
    },
    Similarity: 50,
  }, {
    Face: {
      ExternalImageId: "abc",
      FaceId: "987",
    },
    Similarity: 20,
  }];

  const assert = [{
    Match: 50,
    Person: people[0].id,
  }, {
    Match: 35, // (50 + 20 + 0 /3)
    Person: people[1].id,
  }];
  const result = faces.getPeopleForFace(people, faceMatches);
  t.deepEqual(result, assert, "getPeopleForFace deepequal");
  t.end();
});

test("getPeopleForFaces", (t) => {
  try {
    faces.getPeopleForFaces(newImage, existingPeople, mockFaceMatcher)
      .then((res) => {
        t.equal(res.length, 2);
        t.equal(res[0].FaceId, uuids.someUserImageOneFaceOne);
        t.equal(res[0].People.length, 2);
        t.equal(res[0].People[0].Person, uuids.oren);
        t.equal(res[0].People[0].Match, 50, "match 50 for person 0 (1 of 2 faces match)");
        t.equal(res[1].FaceId, uuids.someUserImageOneFaceTwo);
        t.equal(res[1].People[0].Match, 0);
        t.end();
      });
  } catch (e) {
    t.fail(e);
  }
});

test("getNewPeople - faces that don't match an existing person", (t) => {

  const facesWithMatchedPeople: IFaceWithPeople[] = [{
    BoundingBox: boundingBox,
    ExternalImageId: uuid.v1(),
    FaceId: uuid.v1(),
    FaceMatches: [],
    ImageDimensions: imageDimensions,
    People: [{
      Match: 23,
      Person: "fred",
    }],
    img_key: "some.jpg",
    userIdentityId: "hjghjg",
  }, {
    BoundingBox: boundingBox,
    ExternalImageId: uuid.v1(),
    FaceId: uuid.v1(),
    FaceMatches: [],
    ImageDimensions: imageDimensions,
    People: [{
      Match: 85,
      Person: "ginger",
    }],
    img_key: "some.jpg",
    userIdentityId: "hjghjg",
  }];
  const result = faces.getNewPeople(facesWithMatchedPeople);
  t.equal(result.length, 1);
  t.equal(result[0].faces[0].FaceId, facesWithMatchedPeople[0].FaceId);
  t.end();
});

test("getNewPeople - thumbnailBoundingBox", (t) => {
  const facesWithMatchedPeople: IFaceWithPeople[] = [{
    BoundingBox: boundingBox,
    ExternalImageId: "50925d60-c474-11e8-9af4-75858744cb8b",
    FaceId: "aafb9f96-14bb-47ac-92c4-427d0a73b039",
    FaceMatches: [{
      Face: {
        BoundingBox: boundingBox,
        Confidence: 99.99979400634766,
        ExternalImageId: "a8dd4440-c46e-11e8-a3d9-4b2671790ad7",
        FaceId: "2423c8f4-04f5-44de-88a2-f0cbd4726883",
        ImageId: "050a0025-64b9-56e7-92a8-82ab869aeb10",
      },
      Similarity: 100,
    }],
    ImageDimensions: imageDimensions,
    People: new Array<IPersonMatch>(),
    img_key: "tester/test/mock/large_colour_face_parsing_error.jpg",
    userIdentityId: "us-east-1:744efc36-bb66-4514-b30c-b7f1085de233",
  }];
  const result = faces.getNewPeople(facesWithMatchedPeople);
  t.equal(result.length, 1);
  t.deepEqual(result[0].boundingBox, facesWithMatchedPeople[0].BoundingBox);
  t.end();
});

test("getFacesThatMatchThisPerson", (t) => {
  const person: IPerson = {
    faces: new Array<IFace>(),
    id: uuid.v1(),
    imageDimensions,
    img_key: "ghgj",
    name: "hjhj",
    thumbnail: "hkjj",
    userIdentityId: "hjghjg",
  };

  const facesWithMatchedPeople: IFaceWithPeople[] = [{
    BoundingBox: boundingBox,
    ExternalImageId: uuid.v1(),
    FaceId: uuid.v1(),
    FaceMatches: new Array<FaceMatch>(),
    ImageDimensions: imageDimensions,
    People: [{
      Match: 23,
      Person: person.id,
    }],
    img_key: "ghgj",
    userIdentityId: "hjghjg",
  }, {
    BoundingBox: boundingBox,
    ExternalImageId: uuid.v1(),
    FaceId: uuid.v1(),
    FaceMatches: new Array<FaceMatch>(),
    ImageDimensions: imageDimensions,
    People: [{
      Match: 85,
      Person: person.id,
    }],
    img_key: "ghgj",
    userIdentityId: "hjghjg",
  }];
  const result = faces.getFacesThatMatchThisPerson(person, facesWithMatchedPeople);
  t.equal(result.length, 1);
  t.equal(result[0].FaceId, facesWithMatchedPeople[1].FaceId);
  t.end();
});

test("getUpdatedPeople", (t) => {
  const people: IPerson[] = [{
    faces: [{
      ExternalImageId: uuid.v1(),
      FaceId: uuid.v1(),
    }],
    id: uuid.v1(),
    imageDimensions,
    img_key: "some.jpg",
    name: "kjk",
    thumbnail: "some-suffix.jpg",
    userIdentityId: "some-str",
  }, {
    faces: [{
      ExternalImageId: uuid.v1(),
      FaceId: uuid.v1(),
    }],
    id: uuid.v1(),
    imageDimensions,
    img_key: "some.jpg",
    name: "hjh",
    thumbnail: "some-suffix.jpg",
    userIdentityId: "some-str",
  }];
  const facesWithMatchedPeople: IFaceWithPeople[] = [{
    BoundingBox: boundingBox,
    ExternalImageId: uuid.v1(),
    FaceId: uuid.v1(),
    FaceMatches: new Array<FaceMatch>(),
    ImageDimensions: imageDimensions,
    People: [{
      Match: 23,
      Person: people[0].id,
    }],
    img_key: "one.jpg",
    userIdentityId: "hjghjg",
  }, {
    BoundingBox: boundingBox,
    ExternalImageId: uuid.v1(),
    FaceId: uuid.v1(),
    FaceMatches: new Array<FaceMatch>(),
    ImageDimensions: imageDimensions,
    People: [{
      Match: 85,
      Person: people[0].id,
    }],
    img_key: "one.jpg",
    userIdentityId: "hjghjg",
  }];
  const newPeople = faces.getNewPeople(facesWithMatchedPeople);
  const result = faces.getUpdatedPeople(people, facesWithMatchedPeople, newPeople);
  t.equal(result[0].faces.length, 2, "add face to person 1");
  t.equal(result[0].faces[1].FaceId, facesWithMatchedPeople[1].FaceId, "should find the id for the inserted record");
  t.equal(result.length, people.length + 1, "add a new person for the unmatched face");
  t.equal(result[2].name, "", "new person has an empty name field");
  t.equal(
    result[2].faces[0].FaceId,
    facesWithMatchedPeople[0].FaceId, "face with low person 1 match is key face for new person");
  t.end();
});

test("getUpdatedPeople - new person with no matching faces", (t) => {
  const people = new Array<IPerson>();
  const facesWithMatchedPeople: IFaceWithPeople[] = [{
    BoundingBox: boundingBox,
    ExternalImageId: uuid.v1(),
    FaceId: uuid.v1(),
    FaceMatches: new Array<FaceMatch>(),
    ImageDimensions: imageDimensions,
    People: new Array<IPersonMatch>(),
    img_key: "one.jpg",
    userIdentityId: "hjghjg",
  }];
  const newPeople = faces.getNewPeople(facesWithMatchedPeople);
  const result = faces.getUpdatedPeople(people, facesWithMatchedPeople, newPeople);
  t.equal(result.length, 1, "add a new person for the unmatched face");
  t.equal(result[0].name, "", "new person has an empty name field");
  t.equal(
    result[0].faces[0].FaceId,
    facesWithMatchedPeople[0].FaceId, "face with no people matches is key face for new person");
  t.end();
});

test("getUpdatedPeople - no faces detected in image", (t) => {
  const people: IPerson[] = [{
    faces: [{
      ExternalImageId: uuid.v1(),
      FaceId: uuid.v1(),
    }],
    id: uuid.v1(),
    imageDimensions,
    img_key: "some.jpg",
    name: "jhj",
    thumbnail: "some-suffix.jpg",
    userIdentityId: "some-str",
  }, {
    faces: [{
      ExternalImageId: uuid.v1(),
      FaceId: uuid.v1(),
    }],
    id: uuid.v1(),
    imageDimensions,
    img_key: "some.jpg",
    name: "jhj",
    thumbnail: "some-suffix.jpg",
    userIdentityId: "some-str",
  }];
  const facesWithMatchedPeople = [];
  const result = faces.getUpdatedPeople(people, facesWithMatchedPeople, []);
  t.equal(result.length, 2, "no peeps added");
  t.equal(result[0].faces.length, 1, "no faces added");
  t.end();
});

test("getUpdateBody - no people", (t) => {
  faces.getPeopleForFaces(newImage, existingPeople, mockFaceMatcher)
    .then((facesWithPeople) => {
      const result = faces.getUpdateBody(facesWithPeople, new Array<IPerson>());
      t.equal(result.people.length, 0, "passes joi validation but has 0 results, as none over threshold");
      t.end();
    })
    .catch(t.fail);
});

test("getUpdateBody - unique people", (t) => {
  const person: IPerson = {
    faces: [{
      ExternalImageId: uuid.v1(),
      FaceId: uuid.v1(),
    }],
    id: uuid.v1(),
    imageDimensions,
    img_key: "some.jpg",
    name: "jhj",
    thumbnail: "some-suffix.jpg",
    userIdentityId: "some-str",
  };
  const facesWithPeople = [];
  const newPeople: IPerson[] = [{
    faces: [{
      ExternalImageId: uuid.v1(),
      FaceId: uuid.v1(),
    }],
    id: person.id,
    imageDimensions,
    img_key: "some.jpg",
    name: "jhj",
    thumbnail: "some-suffix.jpg",
    userIdentityId: "some-str",
  }, {
    faces: [{
      ExternalImageId: uuid.v1(),
      FaceId: uuid.v1(),
    }],
    id: person.id,
    imageDimensions,
    img_key: "some.jpg",
    name: "jhj",
    thumbnail: "some-suffix.jpg",
    userIdentityId: "some-str",
  }];
  const result = faces.getUpdateBody(facesWithPeople, newPeople);
  t.equal(result.people.length, 1);
  t.deepEqual(result.people, [person.id], "dedupes person ids");
  t.end();
});

test("getUpdateBody - has matches with existing people", (t) => {
  const person: IPerson = {
    faces: [{
      ExternalImageId: uuid.v1(),
      FaceId: uuid.v1(),
    }],
    id: uuid.v1(),
    imageDimensions,
    img_key: "some.jpg",
    name: "jhj",
    thumbnail: "some-suffix.jpg",
    userIdentityId: "some-str",
  };
  const facesWithPeople: IFaceWithPeople[] = [{
    BoundingBox: boundingBox,
    ExternalImageId: uuid.v1(),
    FaceId: uuid.v1(),
    FaceMatches: [{
      Face: {
        ExternalImageId: uuid.v1(),
        FaceId: uuid.v1(),
      },
      Similarity: 45,
    }],
    ImageDimensions: imageDimensions,
    People: [{
      Match: 23,
      Person: person.id,
    }],
    img_key: "jh",
    userIdentityId: "ghgj",
  }, {
    BoundingBox: boundingBox,
    ExternalImageId: uuid.v1(),
    FaceId: uuid.v1(),
    FaceMatches: [{
      Face: {
        ExternalImageId: uuid.v1(),
        FaceId: uuid.v1(),
      },
      Similarity: 85,
    }],
    ImageDimensions: imageDimensions,
    People: [{
      Match: 85,
      Person: person.id,
    }],
    img_key: "jh",
    userIdentityId: "ghgj",
  }];
  const result = faces.getUpdateBody(facesWithPeople, new Array<IPerson>());
  t.deepEqual(result.people, [person.id], "passes joi validation and 1 results, as one face is over threshold");
  t.end();
});

test("getUpdateBody - has matches with a new person but none with existing people", (t) => {
  const person = {
    id: uuid.v1(),
  };
  const facesWithPeople: IFaceWithPeople[]  = [{
    BoundingBox: boundingBox,
    ExternalImageId: uuid.v1(),
    FaceId: uuid.v1(),
    FaceMatches: [{
      Face: {
        ExternalImageId: uuid.v1(),
        FaceId: uuid.v1(),
      },
      Similarity: 45,
    }],
    ImageDimensions: imageDimensions,
    People: [{
      Match: 23,
      Person: person.id,
    }],
    img_key: "jh",
    userIdentityId: "ghgj",
  }];
  const newPeople: IPerson[] = [{
    faces: [{
      ExternalImageId: uuid.v1(),
      FaceId: uuid.v1(),
    }],
    id: person.id,
    imageDimensions,
    img_key: "some.jpg",
    name: "jhj",
    thumbnail: "some-suffix.jpg",
    userIdentityId: "some-str",
  }];
  const result = faces.getUpdateBody(facesWithPeople, newPeople);
  t.deepEqual(result.people, [newPeople[0].id], "passes joi validation and 1 results, as one face is new");
  t.end();
});

test("getUpdatePathParameters", (t) => {
  const newImageForUpdate: IImage = {
    birthtime: 34354345,
    createdAt: 575565,
    faces: new Array<FaceRecord>(),
    group: "ghjg",
    id: uuid.v1(),
    img_key: "hghgj",
    meta: {
      height: 555,
      lastModified: 68768687,
      name: "filename.jpg",
      size: 343434,
      type: "jpg",
      width: 333,
    },
    people: [],
    tags: [],
    updatedAt: 7797979789,
    userIdentityId: "ghjghg",
    username: "bob",
  };
  const result = faces.getUpdatePathParameters(newImageForUpdate);
  t.equal(result.username, "bob");
  t.end();
});
