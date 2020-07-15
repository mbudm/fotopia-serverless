import { S3EventRecord } from "aws-lambda";
import * as test from "tape";
import * as uuidv5 from "uuid/v5";
import * as fotoEventsFns from "./fotoEvents";
import { ITraceMeta } from "./types";

const exampleCreateRecord: S3EventRecord = {
  awsRegion: "us-east-1",
  eventName: "ObjectCreated:Put",
  eventSource: "aws:s3",
  eventTime: "2020-07-04T10:42:08.568Z",
  eventVersion: "2.1",
  requestParameters: { sourceIPAddress: "35.231.58.0" },
  responseElements: {
    "x-amz-id-2":
      "PtMZZYoSPX+puRBVCuWzv4Z5aNdQkp8gh8u2CA6txgGb00NNZg/nmDvAhkFhQ3/dNwb1ZH5omgX9zM0ilf/Gaw7qBtPdID59E0/v0cQbCD0=",
      "x-amz-request-id": "9599B8598CE84656",
  },
  s3: {
    bucket: {
      arn: "arn:aws:s3:::fotopia-web-app-mbudm-alpha",
      name: "fotopia-web-app-mbudm-alpha",
      ownerIdentity: { principalId: "AVA4PR7F8OFAJ" },
    },
    configurationId: "fotopia-web-app-alpha-fotoEvents-68a737133cefb25bff959852b8f04754",
    object: {
      eTag: "52cfca717f38feb3ed22d9ed86aacfcb",
      key:
        "protected/us-east-1%3A6120a90c-ae88-4421-9c9a-7bc6c5ad7cab/tester/four_people.jpg",
      sequencer: "005F005D03E28E7274",
      size: 205647,
    },
    s3SchemaVersion: "1.0",
  },
  userIdentity: {
    principalId: "AWS:AROAVKTYX5RREW4A6WV26:CognitoIdentityCredentials",
  },
};

test("getKeyFromRecord", (t) => {
  const result = fotoEventsFns.getKeyFromRecord(exampleCreateRecord);
  t.equal(
    result,
    "protected/us-east-1:6120a90c-ae88-4421-9c9a-7bc6c5ad7cab/tester/four_people.jpg",
    "converts encoded colon in useridentityid",
  );
  t.end();
});

test("parseUserIdentityIdFromKey", (t) => {
  const uid = "xyz123";
  const key = `protected/${uid}/username/path/to/file.jpg`;
  const result = fotoEventsFns.parseUserIdentityIdFromKey(key);
  t.equal(
    result,
    uid,
    "userIdentityId parsed from object key",
  );
  t.end();
});

test("parseUsernameFromKey", (t) => {
  const username = "xyz123";
  const key = `protected/uid/${username}/path/to/file.jpg`;
  const result = fotoEventsFns.parseUsernameFromKey(key);
  t.equal(
    result,
    username,
    "username parsed from object key",
  );
  t.end();
});

test("getBasicKey", (t) => {
  const basicKey = "tester/sub/folder/xyz123.png";
  const key = `protected/uid/${basicKey}`;
  const result = fotoEventsFns.getBasicKey(key);
  t.equal(
    result,
    basicKey,
    "basicKey doesn't include amplify folder and user identity id",
  );
  t.end();
});

const baseS3EventRecord: S3EventRecord = {
  awsRegion: "us-west-2",
  eventName: "ObjectCreated:Put",
  eventSource: "aws:s3",
  eventTime: "1970-01-01T00:00:00.000Z",
  eventVersion: "2.1",
  requestParameters: {
    sourceIPAddress: "127.0.0.1",
  },
  responseElements: {
    "x-amz-id-2": "FMyUVURIY8/IgAtTv8xRjskZQpcIZ9KG4V5Wp6S7S/JRWeUWerMUE5JgHvANOjpD",
    "x-amz-request-id": "C3D13FE58DE4C810",
  },
  s3: {
    bucket: {
      arn: "arn:aws:s3:::mybucket",
      name: "mybucket",
      ownerIdentity: {
        principalId: "A3NL1KOZZKExample",
      },
    },
    configurationId: "configRule",
    object: {
      eTag: "d41d8cd98f00b204e9800998ecf8427e",
      key: "HappyFace.jpg",
      sequencer: "0055AED6DCD90281E5",
      size: 1024,
      versionId: "096fKKXTRTtl3on89fVO.nfljtsv6qko",
    },
    s3SchemaVersion: "1.0",
  },
  userIdentity: {
    principalId: "AIDAJDPLRKLG7UEXAMPLE",
  },
};

// collected tag types - may test

// const tags1 = {
//   "CountryCode": { value: "AUS", attributes: {}, description: "AUS" },
//   "DateTimeOriginal": {
//     value: "2019-03-03T14:24:50",
//     attributes: {},
//     description: "2019-03-03T14:24:50",
//   },
//   "TimeCreated": {
//     value: "14:24:50+11:00",
//     attributes: {},
//     description: "14:24:50+11:00",
//   },
//   "City": { value: "Melbourne", attributes: {}, description: "Melbourne" },
//   "Country": { value: "Australia", attributes: {}, description: "Australia" },
//   "DateCreated": {
//     value: "2019-03-03T14:24:50.610+11:00",
//     attributes: {},
//     description: "2019-03-03T14:24:50.610+11:00",
//   },
//   "ImageLength": { value: "600", attributes: {}, description: "600" },
//   "ImageWidth": { value: "600", attributes: {}, description: "600" },
//   "Orientation": {
//     value: "1",
//     attributes: {},
//     description: "Horizontal (normal)",
//   },
//   "CreateDate": {
//     value: "2019-03-03T14:24:50",
//     description: "2019-03-03T14:24:50",
//   },
//   "Image Width": { value: 600, description: "600px" },
//   "Image Height": { value: 600, description: "600px" },
// };

// const tags2 = {
//   "Image Height": { value: 1346, description: "1346px" },
//   "Image Width": { value: 2028, description: "2028px" },
//   "Orientation": { id: 274, value: 1, description: "top-left" },
// };

// const tags3 = {
//   "Image Height": { value: 683, description: "683px" },
//   "Image Width": { value: 1024, description: "1024px" },
//   "Date Created": {
//     id: 567,
//     value: [50, 48, 49, 48, 48, 53, 50, 57],
//     description: "2010-05-29",
//   },
//   "Time Created": {
//     id: 572,
//     value: [49, 53, 53, 55, 51, 55, 43, 48, 48, 48, 48],
//     description: "15:57:37+00:00",
//   },
// };

// const tag4 = {
//   "Image Height": { value: 1096, description: "1096px" },
//   "Image Width": { value: 1650, description: "1650px" },
//   Orientation: { id: 274, value: 1, description: "top-left" },
// };
