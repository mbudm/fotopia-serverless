import * as test from "tape";
// import { AttributeValue as ddbAttVals } from 'dynamodb-data-types';

import * as peopleMerge from "./peopleMerge";
import {
  ILoggerBaseParams,
} from "./types";

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

test("combineFaces - faces from people with unique faces", (t) => {
  const result = peopleMerge.combineFaces(existingPeople);

  t.equals(result.length, 5, "is sum of people with diff faces");
  t.end();
});

test("combineFaces - faces from several people with shared faces", (t) => {
  const data = [{...existingPeople[0]}, {...existingPeople[1]}];
  data[1].faces = data[1].faces.concat([data[0].faces[0]]);

  const result = peopleMerge.combineFaces(existingPeople);

  t.equals(result.length, 5, "is still sum of people with diff faces");
  t.equals(result.filter((f) => f.FaceId === data[0].faces[0].FaceId).length, 1, "copied face is not duped");
  t.end();
});

test("getMergePerson - finds person with most faces", (t) => {
  const result = peopleMerge.getMergePerson(existingPeople);

  t.equals(result.id, existingPeople[0].id, "found the first person that has 3 faces");
  t.end();
});

test("getMergePerson - chooses first person for people have the same number of faces", (t) => {
  const evenExistingPeople = [{
    ...existingPeople[1],
    faces: existingPeople[1].faces.slice(0, 1),
  },
  {
    ...existingPeople[0],
    faces: existingPeople[0].faces.slice(0, 1),
  }];

  const result = peopleMerge.getMergePerson(evenExistingPeople);

  t.equals(result.id, existingPeople[1].id, "found the first person in array");
  t.end();
});

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

test("mergePeopleObjects - if face counts even then first person is target merge", (t) => {
  const data = [existingPeople[1].id, existingPeople[0].id];
  const evenExistingPeople = [{
    ...existingPeople[1],
    faces: existingPeople[1].faces.slice(0, 1),
  },
  {
    ...existingPeople[0],
    faces: existingPeople[0].faces.slice(0, 1),
  }];

  const result = peopleMerge.mergePeopleObjects(data, evenExistingPeople);

  t.equal(result.id, existingPeople[1].id, "id");
  t.equal(result.name, existingPeople[1].name, "name");
  t.equal(result.faces.length, 2, "faces length");
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
    {} as ILoggerBaseParams,
  );
  t.ok(result, "result ok");
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
    ...existingPeople[0],
    faces: [{ FaceId: "face1" }],
    id: data[0],
  }, {
    ...existingPeople[0],
    faces: [{ FaceId: "face2" }],
    id: data[1],
  }, {
    ...existingPeople[0],
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
    {} as ILoggerBaseParams,
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
