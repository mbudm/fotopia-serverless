import * as test from "tape";
// import { AttributeValue as ddbAttVals } from 'dynamodb-data-types';

import * as peopleMerge from "./peopleMerge";

const existingPeople = [
  {
    boundingBox: {
      Height: 0.2291666716337204,
      Left: 0.5679687261581421,
      Top: 0.5625,
      Width: 0.171875,
    },
    faces: [
      {
        ExternalImageId: "145f1b80-ca28-11e8-8ef2-33b26c8261ea",
        FaceId: "ffcabb7a-a43d-4ad9-94b3-3191024af0d8",
      },
      {
        ExternalImageId: "ea7d5ed0-cae0-11e8-97a7-9f15cb04b4ad",
        FaceId: "aa4d3faf-2b9b-41d4-a0a6-2025d7997a29",
      },
      {
        ExternalImageId: "5434c05f-8533-5a94-bec2-2a273bf81e5c",
        FaceId: "d5bd96a0-ca26-11e8-b55f-4b74b2479ec2",
      },
    ],
    id: "160fd8c2-ca28-11e8-b55f-4b74b2479ec2",
    imageDimensions: { width: 1280, height: 960 },
    img_key: "tester/2017-07-07 18.38.14-1.jpg",
    name: "Oren",
    thumbnail:
      "tester/2017-07-07 18.38.14-1-face--ffcabb7a-a43d-4ad9-94b3-3191024af0d8.jpg",
    userIdentityId: "us-east-1:9071e2cb-1ed2-4bb5-b930-326aa04bf268",
  },
  {
    boundingBox: {
      Height: 0.1783333271741867,
      Left: 0.24124999344348907,
      Top: 0.3541666567325592,
      Width: 0.13375000655651093,
    },
    faces: [
      {
        ExternalImageId: "2afd6f10-cadf-11e8-a3a8-2be82cd29644",
        FaceId: "b894dbba-0f0b-4eee-a309-33acea0d2898",
      },
      {
        ExternalImageId: "160fd8c2-ca28-11e8-b55f-4b74b2479ec2",
        FaceId: "7ea4a68d-d811-492f-9555-66f48d498a53",
      },
    ],
    id: "2e8fe4a0-cadf-11e8-9c32-d70d53e17c3c",
    imageDimensions: { width: 3264, height: 2448 },
    img_key: "tester/2017-09-28 16.46.28.jpg",
    name: "Oren2",
    thumbnail:
      "tester/2017-09-28 16.46.28-face--b894dbba-0f0b-4eee-a309-33acea0d2898.jpg",
      userIdentityId: "us-east-1:9071e2cb-1ed2-4bb5-b930-326aa04bf268",
  },
];

test("mergePeopleObjects", (t) => {
  const data = [existingPeople[0].id, existingPeople[1].id];
  const result = peopleMerge.mergePeopleObjects(data, existingPeople);
  t.equal(result.id, existingPeople[0].id, "id");
  t.equal(result.name, existingPeople[0].name, "name");
  t.equal(result.faces.length, 5, "faces length");
  t.equal(existingPeople[0].faces.length, 3, "existing 0 unchanged");
  t.equal(existingPeople[1].faces.length, 2, "existing 1 unchanged");
  t.end();
});

test("mergePeopleObjects - argument order doesnt matter, merged person is most faces", (t) => {
  const data = [existingPeople[1].id, existingPeople[0].id];
  const result = peopleMerge.mergePeopleObjects(data, existingPeople);
  t.equal(result.id, existingPeople[0].id, "id");
  t.equal(result.name, existingPeople[0].name, "name");
  t.equal(result.faces.length, 5, "faces length");
  t.end();
});

test("getDeletePeople", (t) => {
  const data = [existingPeople[1].id, existingPeople[0].id];
  const mergedPerson = {
    id: existingPeople[0].id,
  };
  const result = peopleMerge.getDeletePeople(data, mergedPerson, existingPeople);
  t.equal(result.length, 1);
  t.equal(result[0].id, existingPeople[1].id);
  t.end();
});

test("getUpdatedPeople", (t) => {
  const data = [existingPeople[1].id, existingPeople[0].id];
  const mergedPerson = peopleMerge.mergePeopleObjects(data, existingPeople);
  const deletePeople = peopleMerge.getDeletePeople(data, mergedPerson, existingPeople);
  const result = peopleMerge.getUpdatedPeople(
    existingPeople,
    mergedPerson,
    deletePeople,
  );
  t.equal(result.length, 1, "length");
  t.equal(result[0].id, mergedPerson.id, "mergedPerson");
  t.equal(result[0].faces.length, mergedPerson.faces.length, "mergedPerson faces length");
  t.deepEqual(result[0].faces, mergedPerson.faces, "mergedPerson faces deep equal");
  t.end();
});

test("getAllInvokeUpdateParams", (t) => {
  const data = [existingPeople[1].id, existingPeople[0].id];
  const mergedPerson = peopleMerge.mergePeopleObjects(data, existingPeople);
  const deletePeople = peopleMerge.getDeletePeople(data, mergedPerson, existingPeople);
  const imagesWithAffectedPeople = [{
    people: [mergedPerson.id],
  }, {
    people: ["some-unaffected-person-id", deletePeople[0].id],
  }];
  const result = peopleMerge.getAllInvokeUpdateParams(
    imagesWithAffectedPeople,
    mergedPerson,
    deletePeople,
  );
  t.equal(result.length, 2, "length");
  try {
    const firstBodyParam = JSON.parse(JSON.parse(result[0].Payload).body);
    t.equal(firstBodyParam.people[0], mergedPerson.id, "first retains the mergedPerson");
  } catch (e) {
    t.fail();
  }
  try {
    const secondBodyParam = JSON.parse(JSON.parse(result[1].Payload).body);
    t.equal(secondBodyParam.people[0], imagesWithAffectedPeople[1].people[0], "unaffected person id is unchanged");
    t.equal(
      secondBodyParam.people[1],
      mergedPerson.id,
      "second person of image 2 has affected person id changed to merged person");
  } catch (e) {
    t.fail();
  }
  t.end();
});

test("getAllInvokeUpdateParams - simpler mocks", (t) => {
  const data = ["person1id", "person2id", "person3-mostfaces-id"];
  const simpleExisting = [{
    faces: [{ FaceId: "face1" }],
    id: data[0],
  }, {
    faces: [{ FaceId: "face2" }],
    id: data[1],
  }, {
    faces: [{ FaceId: "face1" }, { FaceId: "face2" }],
    id: data[2],
  }];
  const mergedPerson = peopleMerge.mergePeopleObjects(data, simpleExisting);
  const deletePeople = peopleMerge.getDeletePeople(data, mergedPerson, simpleExisting);
  const imagesWithAffectedPeople = [{
    people: [mergedPerson.id],
  }, {
    people: ["some-unaffected-person-id", deletePeople[0].id],
  }];
  const result = peopleMerge.getAllInvokeUpdateParams(
    imagesWithAffectedPeople,
    mergedPerson,
    deletePeople,
  );
  t.equal(result.length, 2, "length");
  try {
    const firstBodyParam = JSON.parse(JSON.parse(result[0].Payload).body);
    t.equal(firstBodyParam.people[0], mergedPerson.id, "first retains the mergedPerson");
  } catch (e) {
    t.fail();
  }
  try {
    const secondBodyParam = JSON.parse(JSON.parse(result[1].Payload).body);
    t.equal(secondBodyParam.people[0], imagesWithAffectedPeople[1].people[0], "unaffected person id is unchanged");
    t.equal(
      secondBodyParam.people[1],
      mergedPerson.id,
      "second person of image 2 has affected person id changed to merged person");
  } catch (e) {
    t.fail();
  }
  t.end();
});

/*
const eventRecord = {
  awsRegion: 'us-east-1',
  dynamodb: {
    ApproximateCreationDateTime: 1539139320,
    Keys: {
      id: { S: '17245f00-cc36-11e8-a001-9df23ff35cdf' },
      username: { S: 'tester' },
    },
    NewImage: {
      birthtime: { N: '1282473624000' },
      createdAt: { N: '1539139337515' },
      faceMatches: {
        L: [
          {
            M: {
              BoundingBox: {
                M: {
                  Height: { N: '0.2651515007019043' },
                  Left: { N: '0.3181818127632141' },
                  Top: { N: '0.19696970283985138' },
                  Width: { N: '0.39772728085517883' },
                },
              },
              ExternalImageId: { S: '17245f00-cc36-11e8-a001-9df23ff35cdf' },
              FaceId: { S: '7ea4a68d-d811-492f-9555-66f48d498a53' },
              FaceMatches: {
                L: [
                  {
                    M: {
                      Face: {
                        M: {
                          BoundingBox: {
                            M: {
                              Height: { N: '0.2441670000553131' },
                              Left: { N: '0.6868749856948853' },
                              Top: { N: '0.1574999988079071' },
                              Width: { N: '0.18312500417232513' },
                            },
                          },
                          Confidence: { N: '98.63890075683594' },
                          ExternalImageId: {
                            S: 'dcee8610-cade-11e8-97a7-9f15cb04b4ad',
                          },
                          FaceId: { S: 'c9f2e0d3-e2a2-4660-a475-b62e65c2df83' },
                          ImageId: { S: '5434c05f-8533-5a94-bec2-2a273bf81e5c' },
                        },
                      },
                      Similarity: { N: '93.34640502929688' },
                    },
                  },
                  {
                    M: {
                      Face: {
                        M: {
                          BoundingBox: {
                            M: {
                              Height: { N: '0.3343749940395355' },
                              Left: { N: '0.06953120231628418' },
                              Top: { N: '0.534375011920929' },
                              Width: { N: '0.25078099966049194' },
                            },
                          },
                          Confidence: { N: '100' },
                          ExternalImageId: {
                            S: '145f1b80-ca28-11e8-8ef2-33b26c8261ea',
                          },
                          FaceId: { S: 'bc7359ab-f6b3-4530-b68e-21d4bdb326fc' },
                          ImageId: { S: '624e46c6-be3d-5f1f-a4a7-2ce50105f17a' },
                        },
                      },
                      Similarity: { N: '80.79607391357422' },
                    },
                  },
                ],
              },
              ImageDimensions: {
                M: { height: { N: '2848' }, width: { N: '4272' } },
              },
              People: {
                L: [
                  {
                    M: {
                      Match: { N: '0' },
                      Person: { S: 'd5bd96a0-ca26-11e8-b55f-4b74b2479ec2' },
                    },
                  },
                  {
                    M: {
                      Match: { N: '0' },
                      Person: { S: '4d5f0bd0-ca27-11e8-b55f-4b74b2479ec2' },
                    },
                  },
                  {
                    M: {
                      Match: { N: '0' },
                      Person: { S: 'ac602ec0-ca27-11e8-b55f-4b74b2479ec2' },
                    },
                  },
                  {
                    M: {
                      Match: { N: '0' },
                      Person: { S: '160fd8c0-ca28-11e8-b55f-4b74b2479ec2' },
                    },
                  },
                  {
                    M: {
                      Match: { N: '87.07123947143555' },
                      Person: { S: '160fd8c1-ca28-11e8-b55f-4b74b2479ec2' },
                    },
                  },
                  {
                    M: {
                      Match: { N: '0' },
                      Person: { S: '160fd8c2-ca28-11e8-b55f-4b74b2479ec2' },
                    },
                  },
                  {
                    M: {
                      Match: { N: '0' },
                      Person: { S: 'fae19b80-cade-11e8-9c32-d70d53e17c3c' },
                    },
                  },
                  {
                    M: {
                      Match: { N: '0' },
                      Person: { S: '2cd98210-cadf-11e8-9c32-d70d53e17c3c' },
                    },
                  },
                  {
                    M: {
                      Match: { N: '0' },
                      Person: { S: '2cd98211-cadf-11e8-9c32-d70d53e17c3c' },
                    },
                  },
                  {
                    M: {
                      Match: { N: '0' },
                      Person: { S: '2e8fbd90-cadf-11e8-9c32-d70d53e17c3c' },
                    },
                  },
                  {
                    M: {
                      Match: { N: '0' },
                      Person: { S: '2e8fe4a0-cadf-11e8-9c32-d70d53e17c3c' },
                    },
                  },
                  {
                    M: {
                      Match: { N: '0' },
                      Person: { S: 'ecd04f80-cae0-11e8-9c32-d70d53e17c3c' },
                    },
                  },
                  {
                    M: {
                      Match: { N: '0' },
                      Person: { S: 'ecd04f81-cae0-11e8-9c32-d70d53e17c3c' },
                    },
                  },
                  {
                    M: {
                      Match: { N: '0' },
                      Person: { S: 'd726b010-cc35-11e8-b94d-55407259e7de' },
                    },
                  },
                  {
                    M: {
                      Match: { N: '0' },
                      Person: { S: 'd726b011-cc35-11e8-b94d-55407259e7de' },
                    },
                  },
                  {
                    M: {
                      Match: { N: '0' },
                      Person: { S: 'f42f8c90-cc35-11e8-b94d-55407259e7de' },
                    },
                  },
                ],
              },
              img_key: { S: 'tester/IMG_5105.JPG' },
              userIdentityId: {
                S: 'us-east-1:9071e2cb-1ed2-4bb5-b930-326aa04bf268',
              },
            },
          },
        ],
      },
      faces: {
        L: [
          {
            M: {
              Face: {
                M: {
                  BoundingBox: {
                    M: {
                      Height: { N: '0.2651515007019043' },
                      Left: { N: '0.3181818127632141' },
                      Top: { N: '0.19696970283985138' },
                      Width: { N: '0.39772728085517883' },
                    },
                  },
                  Confidence: { N: '99.95604705810547' },
                  ExternalImageId: {
                    S: '17245f00-cc36-11e8-a001-9df23ff35cdf',
                  },
                  FaceId: { S: '7ea4a68d-d811-492f-9555-66f48d498a53' },
                  ImageId: { S: 'b5954faa-017b-5bb5-bd8b-7e0a76264092' },
                },
              },
              FaceDetail: {
                M: {
                  BoundingBox: {
                    M: {
                      Height: { N: '0.2651515007019043' },
                      Left: { N: '0.3181818127632141' },
                      Top: { N: '0.19696970283985138' },
                      Width: { N: '0.39772728085517883' },
                    },
                  },
                  Confidence: { N: '99.95604705810547' },
                  Landmarks: {
                    L: [
                      {
                        M: {
                          Type: { S: 'eyeLeft' },
                          X: { N: '0.4299493134021759' },
                          Y: { N: '0.30104178190231323' },
                        },
                      },
                      {
                        M: {
                          Type: { S: 'eyeRight' },
                          X: { N: '0.570453941822052' },
                          Y: { N: '0.29489201307296753' },
                        },
                      },
                      {
                        M: {
                          Type: { S: 'nose' },
                          X: { N: '0.4755714237689972' },
                          Y: { N: '0.35141220688819885' },
                        },
                      },
                      {
                        M: {
                          Type: { S: 'mouthLeft' },
                          X: { N: '0.45522552728652954' },
                          Y: { N: '0.38835689425468445' },
                        },
                      },
                      {
                        M: {
                          Type: { S: 'mouthRight' },
                          X: { N: '0.5842530131340027' },
                          Y: { N: '0.38634249567985535' },
                        },
                      },
                    ],
                  },
                  Pose: {
                    M: {
                      Pitch: { N: '-2.2448184490203857' },
                      Roll: { N: '-3.230152130126953' },
                      Yaw: { N: '-17.513736724853516' },
                    },
                  },
                  Quality: {
                    M: {
                      Brightness: { N: '31.587175369262695' },
                      Sharpness: { N: '86.93206024169922' },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      group: { S: 'sosnowski-roberts' },
      id: { S: '17245f00-cc36-11e8-a001-9df23ff35cdf' },
      img_key: { S: 'tester/IMG_5105.JPG' },
      img_thumb_key: { S: 'tester/IMG_5105-thumbnail.JPG' },
      meta: { M: { height: { N: '2848' }, width: { N: '4272' } } },
      people: { L: [{ S: '160fd8c1-ca28-11e8-b55f-4b74b2479ec2' }] },
      tags: {
        L: [{ S: 'Human' }, { S: 'People' }, { S: 'Person' }, { S: 'Asleep' }],
      },
      updatedAt: { N: '1539139338582' },
      userIdentityId: { S: 'us-east-1:9071e2cb-1ed2-4bb5-b930-326aa04bf268' },
      username: { S: 'tester' },
    },
    OldImage: {
      birthtime: { N: '1282473624000' },
      createdAt: { N: '1539139337515' },
      faces: {
        L: [
          {
            M: {
              Face: {
                M: {
                  BoundingBox: {
                    M: {
                      Height: { N: '0.2651515007019043' },
                      Left: { N: '0.3181818127632141' },
                      Top: { N: '0.19696970283985138' },
                      Width: { N: '0.39772728085517883' },
                    },
                  },
                  Confidence: { N: '99.95604705810547' },
                  ExternalImageId: {
                    S: '17245f00-cc36-11e8-a001-9df23ff35cdf',
                  },
                  FaceId: { S: '7ea4a68d-d811-492f-9555-66f48d498a53' },
                  ImageId: { S: 'b5954faa-017b-5bb5-bd8b-7e0a76264092' },
                },
              },
              FaceDetail: {
                M: {
                  BoundingBox: {
                    M: {
                      Height: { N: '0.2651515007019043' },
                      Left: { N: '0.3181818127632141' },
                      Top: { N: '0.19696970283985138' },
                      Width: { N: '0.39772728085517883' },
                    },
                  },
                  Confidence: { N: '99.95604705810547' },
                  Landmarks: {
                    L: [
                      {
                        M: {
                          Type: { S: 'eyeLeft' },
                          X: { N: '0.4299493134021759' },
                          Y: { N: '0.30104178190231323' },
                        },
                      },
                      {
                        M: {
                          Type: { S: 'eyeRight' },
                          X: { N: '0.570453941822052' },
                          Y: { N: '0.29489201307296753' },
                        },
                      },
                      {
                        M: {
                          Type: { S: 'nose' },
                          X: { N: '0.4755714237689972' },
                          Y: { N: '0.35141220688819885' },
                        },
                      },
                      {
                        M: {
                          Type: { S: 'mouthLeft' },
                          X: { N: '0.45522552728652954' },
                          Y: { N: '0.38835689425468445' },
                        },
                      },
                      {
                        M: {
                          Type: { S: 'mouthRight' },
                          X: { N: '0.5842530131340027' },
                          Y: { N: '0.38634249567985535' },
                        },
                      },
                    ],
                  },
                  Pose: {
                    M: {
                      Pitch: { N: '-2.2448184490203857' },
                      Roll: { N: '-3.230152130126953' },
                      Yaw: { N: '-17.513736724853516' },
                    },
                  },
                  Quality: {
                    M: {
                      Brightness: { N: '31.587175369262695' },
                      Sharpness: { N: '86.93206024169922' },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      group: { S: 'sosnowski-roberts' },
      id: { S: '17245f00-cc36-11e8-a001-9df23ff35cdf' },
      img_key: { S: 'tester/IMG_5105.JPG' },
      img_thumb_key: { S: 'tester/IMG_5105-thumbnail.JPG' },
      meta: { M: { height: { N: '2848' }, width: { N: '4272' } } },
      people: { L: [] },
      tags: {
        L: [{ S: 'Human' }, { S: 'People' }, { S: 'Person' }, { S: 'Asleep' }],
      },
      updatedAt: { N: '1539139337515' },
      userIdentityId: { S: 'us-east-1:9071e2cb-1ed2-4bb5-b930-326aa04bf268' },
      username: { S: 'tester' },
    },
    SequenceNumber: '12039000000000059136241829',
    SizeBytes: 3830,
    StreamViewType: 'NEW_AND_OLD_IMAGES',
  },
  eventID: 'ab4e564cb3c2d5dfa93f51e5179b1159',
  eventName: 'MODIFY',
  eventSource: 'aws:dynamodb',
  eventSourceARN:
    'arn:aws:dynamodb:us-eas******',
  eventVersion: '1.1',
};

test('getNewImageRecords', (t) => {
  const result = ddbAttVals.unwrap(eventRecord.dynamodb.NewImage);
  t.equal(result.faces[0].FaceDetail.Landmarks, {});
  t.end();
});

const newImage = {
  birthtime: 1282473624000,
  createdAt: 1539139337515,
  faceMatches: [ // rather than a separate face matches property move FaceMatches to faces items
    {
      BoundingBox: {
        Height: 0.2651515007019043,
        Left: 0.3181818127632141,
        Top: 0.19696970283985138,
        Width: 0.39772728085517883,
      },
      ExternalImageId: '17245f00-cc36-11e8-a001-9df23ff35cdf',
      FaceId: '7ea4a68d-d811-492f-9555-66f48d498a53',
      FaceMatches: [
        {
          Face: {
            BoundingBox: {
              Height: 0.2441670000553131,
              Left: 0.6868749856948853,
              Top: 0.1574999988079071,
              Width: 0.18312500417232513,
            },
            Confidence: 98.63890075683594,
            ExternalImageId: 'dcee8610-cade-11e8-97a7-9f15cb04b4ad',
            FaceId: 'c9f2e0d3-e2a2-4660-a475-b62e65c2df83',
            ImageId: '5434c05f-8533-5a94-bec2-2a273bf81e5c',
          },
          Similarity: 93.34640502929688,
        },
        {
          Face: {
            BoundingBox: {
              Height: 0.3343749940395355,
              Left: 0.06953120231628418,
              Top: 0.534375011920929,
              Width: 0.25078099966049194,
            },
            Confidence: 100,
            ExternalImageId: '145f1b80-ca28-11e8-8ef2-33b26c8261ea',
            FaceId: 'bc7359ab-f6b3-4530-b68e-21d4bdb326fc',
            ImageId: '624e46c6-be3d-5f1f-a4a7-2ce50105f17a',
          },
          Similarity: 80.79607391357422,
        },
      ],
      ImageDimensions: { height: 2848, width: 4272 },
      People: [ // 0 matches are kinda useful as we know which people havent been checked against
        // but as the person get's more faces this could change so this is not relevant
        // so maybe put this on people
        { Match: 0, Person: 'd5bd96a0-ca26-11e8-b55f-4b74b2479ec2' },
        { Match: 0, Person: '4d5f0bd0-ca27-11e8-b55f-4b74b2479ec2' },
        { Match: 0, Person: 'ac602ec0-ca27-11e8-b55f-4b74b2479ec2' },
        { Match: 0, Person: '160fd8c0-ca28-11e8-b55f-4b74b2479ec2' },
        {
          Match: 87.07123947143555,
            // this could go lower over time as new faces emerge but thats unlikely I think
          Person: '160fd8c1-ca28-11e8-b55f-4b74b2479ec2',
        },
        { Match: 0, Person: '160fd8c2-ca28-11e8-b55f-4b74b2479ec2' },
        { Match: 0, Person: 'fae19b80-cade-11e8-9c32-d70d53e17c3c' },
        { Match: 0, Person: '2cd98210-cadf-11e8-9c32-d70d53e17c3c' },
        { Match: 0, Person: '2cd98211-cadf-11e8-9c32-d70d53e17c3c' },
        { Match: 0, Person: '2e8fbd90-cadf-11e8-9c32-d70d53e17c3c' },
        { Match: 0, Person: '2e8fe4a0-cadf-11e8-9c32-d70d53e17c3c' },
        { Match: 0, Person: 'ecd04f80-cae0-11e8-9c32-d70d53e17c3c' },
        { Match: 0, Person: 'ecd04f81-cae0-11e8-9c32-d70d53e17c3c' },
        { Match: 0, Person: 'd726b010-cc35-11e8-b94d-55407259e7de' },
        { Match: 0, Person: 'd726b011-cc35-11e8-b94d-55407259e7de' },
        { Match: 0, Person: 'f42f8c90-cc35-11e8-b94d-55407259e7de' },
      ],
      img_key: 'tester/IMG_5105.JPG',
      userIdentityId: 'us-east-1:9071e2cb-1ed2-4bb5-b930-326aa04bf268',
    },
  ],
  faces: [
    {
      Face: {
        BoundingBox: {
          Height: 0.2651515007019043,
          Left: 0.3181818127632141,
          Top: 0.19696970283985138,
          Width: 0.39772728085517883,
        },
        Confidence: 99.95604705810547,
        ExternalImageId: '17245f00-cc36-11e8-a001-9df23ff35cdf',
        FaceId: '7ea4a68d-d811-492f-9555-66f48d498a53',
        ImageId: 'b5954faa-017b-5bb5-bd8b-7e0a76264092',
      },
      FaceDetail: {
        BoundingBox: {
          Height: 0.2651515007019043,
          Left: 0.3181818127632141,
          Top: 0.19696970283985138,
          Width: 0.39772728085517883,
        },
        Confidence: 99.95604705810547,
        Landmarks: [
          { Type: 'eyeLeft', X: 0.4299493134021759, Y: 0.30104178190231323 },
          { Type: 'eyeRight', X: 0.570453941822052, Y: 0.29489201307296753 },
          { Type: 'nose', X: 0.4755714237689972, Y: 0.35141220688819885 },
          { Type: 'mouthLeft', X: 0.45522552728652954, Y: 0.38835689425468445 },
          { Type: 'mouthRight', X: 0.5842530131340027, Y: 0.38634249567985535 },
        ],
        Pose: {
          Pitch: -2.2448184490203857,
          Roll: -3.230152130126953,
          Yaw: -17.513736724853516,
        },
        Quality: {
          Brightness: 31.587175369262695,
          Sharpness: 86.93206024169922,
        },
      },
    },
  ],
  group: 'sosnowski-roberts',
  id: '17245f00-cc36-11e8-a001-9df23ff35cdf',
  img_key: 'tester/IMG_5105.JPG',
  img_thumb_key: 'tester/IMG_5105-thumbnail.JPG',
  meta: { height: 2848, width: 4272 },
  people: ['160fd8c1-ca28-11e8-b55f-4b74b2479ec2'],
  tags: ['Human', 'People', 'Person', 'Asleep'],
  updatedAt: 1539139338582,
  userIdentityId: 'us-east-1:9071e2cb-1ed2-4bb5-b930-326aa04bf268',
  username: 'tester',
};
*/
