import { DetectLabelsResponse, FaceRecord } from "aws-sdk/clients/rekognition";
import * as test from "tape";
import * as uuid from "uuid";
import * as create from "./create";
import { ICreateBody } from "./types";

const username = "jethro";

const requestBody: ICreateBody = {
  birthtime: 123,
  img_key: `${username}/me.jpg`,
  meta: {
    height: 200,
    width: 100,
  },
  tags: ["blue"],
  userIdentityId: username,
  username,
};

const recordId = uuid.v1();

const fotopiaGroup = "my-group";

test("createThumbKey - safe filename", (t) => {
  const key = "username/somefile.jpg";
  const thumbKey = `username/somefile${create.THUMB_SUFFIX}.jpg`;
  const result = create.createThumbKey(key);
  t.equal(thumbKey, result);
  t.end();
});

test("createThumbKey - filename extra dots", (t) => {
  const key = "user.name/some.file.jpg";
  const thumbKey = `user.name/some.file${create.THUMB_SUFFIX}.jpg`;
  const result = create.createThumbKey(key);
  t.equal(thumbKey, result);
  t.end();
});

test("createThumbKey - filename with space", (t) => {
  const key = "test/mock/large_group copy.jpg";
  const thumbKey = `test/mock/large_group copy${create.THUMB_SUFFIX}.jpg`;
  const result = create.createThumbKey(key);
  t.equal(thumbKey, result);
  t.end();
});

test("getDynamoDbParams", (t) => {
  process.env.DYNAMODB_TABLE = "TABLE";
  const faces: FaceRecord[] = [];
  const labels: DetectLabelsResponse = {
    Labels: [],
  };
  try {
    const params = create.getDynamoDbParams(requestBody, recordId, fotopiaGroup, faces, labels);
    t.deepEqual(params.Item.username, requestBody.username);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

test("getTagsFromRekognitionLabels", (t) => {
  const labels = {
    Labels: [
      {
        Confidence: 99.29840850830078,
        Name: "Human",
      },
      {
        Confidence: 99.29840850830078,
        Name: "People",
      },
      {
        Confidence: 99.29840850830078,
        Name: "Person",
      },
      {
        Confidence: 89.55351257324219,
        Name: "Face",
      },
      {
        Confidence: 89.55351257324219,
        Name: "Portrait",
      },
    ],
  };
  const result = create.getTagsFromRekognitionLabels(labels);
  t.equal(result.length, 5);
  t.equal(result[0], labels.Labels[0].Name);
  t.end();
});

test("getTagsFromRekognitionLabels null arg", (t) => {
  const labels: DetectLabelsResponse = {
    Labels: [],
  };
  const result = create.getTagsFromRekognitionLabels(labels);
  t.deepEqual(result, []);
  t.end();
});
