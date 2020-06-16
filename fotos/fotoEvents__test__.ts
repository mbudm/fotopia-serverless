import { S3EventRecord } from "aws-lambda";
import * as test from "tape";
import * as uuidv5 from "uuid/v5";
import * as fotoEventsFns from "./fotoEvents";
import { ITraceMeta } from "./types";

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

test("removeCreateRecordsIfDeletePresent, single remove record unchanged", (t) => {
  const records: S3EventRecord[] = [{
    ...baseS3EventRecord,
    eventName: "ObjectRemoved:Delete",
  }];
  const result: S3EventRecord[] = fotoEventsFns.removeCreateRecordsIfDeletePresent(records);
  t.equal(result.length, 1);
  t.end();
});

test("removeCreateRecordsIfDeletePresent, single delete record unchanged", (t) => {
  const records: S3EventRecord[] = [{
    ...baseS3EventRecord,
  }];
  const result: S3EventRecord[] = fotoEventsFns.removeCreateRecordsIfDeletePresent(records);
  t.equal(result.length, 1);
  t.end();
});

test("removeCreateRecordsIfDeletePresent, multiple remove records unchanged", (t) => {
  const records: S3EventRecord[] = [{
    ...baseS3EventRecord,
    eventName: "ObjectRemoved:Delete",
  }, {
    ...baseS3EventRecord,
    eventName: "ObjectRemoved:Delete",
  }];
  const result: S3EventRecord[] = fotoEventsFns.removeCreateRecordsIfDeletePresent(records);
  t.equal(result.length, 2);
  t.end();
});

test("removeCreateRecordsIfDeletePresent, create and remove reduced to just remove record", (t) => {
  const records: S3EventRecord[] = [{
    ...baseS3EventRecord,
    eventName: "ObjectCreated:Put",
  }, {
    ...baseS3EventRecord,
    eventName: "ObjectRemoved:Delete",
  }];
  const result: S3EventRecord[] = fotoEventsFns.removeCreateRecordsIfDeletePresent(records);
  t.equal(result.length, 1);
  t.end();
});

test("removeCreateRecordsIfDeletePresent, create after remove still reduces to just remove record", (t) => {
  const records: S3EventRecord[] = [{
    ...baseS3EventRecord,
    eventName: "ObjectRemoved:Put",
  }, {
    ...baseS3EventRecord,
    eventName: "ObjectCreated:Delete",
  }];
  const result: S3EventRecord[] = fotoEventsFns.removeCreateRecordsIfDeletePresent(records);
  t.equal(result.length, 1);
  t.end();
});

test("getInvokeDeleteRequest contains a uuid v5 namespace id", (t) => {
  const traceMeta: ITraceMeta = {
    parentId: "abc",
    traceId: "123",
  };
  const id = uuidv5(baseS3EventRecord.s3.object.key, uuidv5.DNS);
  const result = fotoEventsFns.getInvokeDeleteRequest(baseS3EventRecord, traceMeta);
  const parsedPayload = JSON.parse(result.Payload as string);
  t.equal(parsedPayload.pathParameters.id, id);
  t.end();
});
