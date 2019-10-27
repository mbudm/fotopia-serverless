import {
  InvocationRequest,
} from "aws-sdk/clients/lambda";
import * as test from "tape";
import contextMock from "./common/contextMock";
import * as deleteFns from "./delete";
import { IImage, IPerson, IPersonWithImages } from "./types";

const username = "billy-mae";
const request = {
  id: "some id",
  username,
};

test("getS3Params parses the invocation response", (t) => {
  process.env.S3_BUCKET = "mybucket";
  const img: IImage = {
    ...request,
    birthtime: 123,
    group: "L7",
    img_key: "yo.jpg",
    meta: {
      height: 200,
      width: 200,
    },
    userIdentityId: "squad-21",
  };

  const result = deleteFns.getS3Params(img);

  t.equal(
    result.Key,
    `protected/${img.userIdentityId}/${img.img_key}`,
    "key is combination of img_key and userIdentityId",
  );
  t.end();
});

test("getInvokeGetParams, puts the request params into pathParameters", (t) => {
  process.env.LAMBDA_PREFIX = "functional-";
  const result: InvocationRequest = deleteFns.getInvokeGetParams(request);
  const payload = JSON.parse(result.Payload as string);
  t.deepEqual(payload.pathParameters, request);
  t.end();
});

const imageBase: IImage = {
  birthtime: 123,
  group: "mag-7",
  id: "abc-1",
  img_key: "me.jpg",
  meta: {
    height: 200,
    width: 200,
  },
  userIdentityId: "uid",
  username: "tamil",
};

test("getInvokeQueryParams, adds the people from image into the request body", (t) => {
  const imageWithThreepeople: IImage = {
    ...imageBase,
    people: [
      "p-2",
      "p-3",
    ],
  };
  const result = deleteFns.getInvokeQueryParams(
    imageWithThreepeople,
    {
      parentId: "blah",
      traceId: "123",
    },
    contextMock,
  );
  const payloadParsed = JSON.parse(result.Payload! as string);
  const bodyParsed = JSON.parse(payloadParsed.body);
  t.deepEqual(bodyParsed.criteria.people,  imageWithThreepeople.people);
  t.end();
});

test("parseQueryResponse - handle a IImage response", (t) => {
  const image: IImage = {
    ...imageBase,
    people: [
      "p-2",
      "p-3",
    ],
  };
  const imageInResponse: IImage = {
    ...imageBase,
    id: "xyz",
    people: [
      "p-3",
    ],
  };
  const queryResponse = {
    Payload: JSON.stringify({
      body: JSON.stringify([imageInResponse]),
    }),
  };
  const result = deleteFns.parseQueryResponse(queryResponse, image);
  t.equal(result.length, 2, "length 2 - people from source image");
  const p3 = result.find((p) => p.id === "p-3");
  t.ok(p3, "p-3 item in array");
  t.deepEqual(p3!.imageIds, [imageInResponse.id], "1 image (xyz) for p-3 person");
  t.end();
});

test("parseQueryResponse - handle an empty response", (t) => {
  const image: IImage = {
    ...imageBase,
    people: [
      "p-2",
      "p-3",
    ],
  };

  const queryResponse = {
    Payload: JSON.stringify({
      body: JSON.stringify([]),
    }),
  };
  const result = deleteFns.parseQueryResponse(queryResponse, image);

  t.equal(result.length, 2, "length 2 - people from source image");
  t.equal(result[0].imageIds.length, 0, "No images for first person");
  t.equal(result[1].imageIds.length, 0, "No images for 2nd person");
  t.end();
});

test("getPeopleWithImages converts an IImage[] to IPersonWithImages[]", (t) => {
  const image: IImage = {
    ...imageBase,
    id: "i-0",
    people: ["p-1", "p-3"],
  };
  const images: IImage[] = [
    {
      ...imageBase,
      id: "i-1",
      people: [
        "p-1", "p-2",
      ],
    },
    {
      ...imageBase,
      id: "i-2",
      people: [
        "p-1",
      ],
    },
  ];

  const result = deleteFns.getPeopleWithImages(image, images);

  t.equal(result.length, 2, "2 people idenitified");
  const p1: IPersonWithImages | undefined = result.find((p) => p.id === "p-1");
  t.deepEqual(p1!.imageIds, ["i-1", "i-2"], "p-1 is in both other images");
  const p2: IPersonWithImages | undefined = result.find((p) => p.id === "p-2");
  t.notOk(p2, "p-2 is not in the result, as it's not in the source image");
  const p3: IPersonWithImages | undefined = result.find((p) => p.id === "p-3");
  t.deepEqual(p3!.imageIds, [], "p-0 doesn't appear in any other images");
  t.end();
});

test("getPeopleWithImages excludes the image being deleted", (t) => {
  const image: IImage = {
    ...imageBase,
    id: "i-0",
    people: ["p-1", "p-3"],
  };
  const images: IImage[] = [
    {
      ...imageBase,
      id: "i-0",
      people: [
        "p-1", "p-2",
      ],
    },
    {
      ...imageBase,
      id: "i-2",
      people: [
        "p-1",
      ],
    },
  ];

  const result = deleteFns.getPeopleWithImages(image, images);

  t.equal(result.length, 2, "2 people idenitified");
  const p1: IPersonWithImages | undefined = result.find((p) => p.id === "p-1");
  t.deepEqual(p1!.imageIds, ["i-2"], "p-1 is in both other images but i-0 is excluded");
  const p2: IPersonWithImages | undefined = result.find((p) => p.id === "p-2");
  t.notOk(p2, "p-2 is not in the result, as it's not in the source image");
  const p3: IPersonWithImages | undefined = result.find((p) => p.id === "p-3");
  t.deepEqual(p3!.imageIds, [], "p-0 doesn't appear in any other images");
  t.end();
});

test("getPeopleWithImages converts an empty IImage[] to IPersonWithImages[]", (t) => {
  const image: IImage = {
    ...imageBase,
    id: "i-0",
    people: ["p-1", "p-3"],
  };
  const images: IImage[] = [];

  const result = deleteFns.getPeopleWithImages(image, images);

  t.equal(result.length, 2, "2 people idenitified");
  const p1: IPersonWithImages | undefined = result.find((p) => p.id === "p-1");
  t.deepEqual(p1!.imageIds, [], "p-1 doesn't appear in any other images");
  const p2: IPersonWithImages | undefined = result.find((p) => p.id === "p-2");
  t.notOk(p2, "p-2 is not in the result, as it's not in the source image");
  const p3: IPersonWithImages | undefined = result.find((p) => p.id === "p-3");
  t.deepEqual(p3!.imageIds, [], "p-0 doesn't appear in any other images");
  t.end();
});

test("getDeletePeople identifies the people that dont appear in other images", (t) => {
  const imagesForPeople: IPersonWithImages[] = [{
    id: "p-1",
    imageIds: ["img-1", "img-2"],
  }, {
    id: "p-2",
    imageIds: ["img-1"],
  }, {
    id: "p-3",
    imageIds: [],
  }];

  const result = deleteFns.getDeletePeople(imagesForPeople);

  t.equal(result.length, 1, "found 1 person to be deleted");
  t.equal(result[0], "p-3", "p-3 will be deleted");
  t.end();
});

const personBase = {
  faces: [],
  imageDimensions: {
    height: 200,
    width: 200,
  },
  img_key: "me.jpg",
  name: "Fred",
  thumbnail: "me-thumb.jpg",
  userIdentityId: "uid",
};

test("getUpdatedPeople removes people that appear in no other images from existing people", (t) => {
  const existingPeople: IPerson[] = [{
    ...personBase,
    id: "p-1",
  }, {
    ...personBase,
    id: "p-2",
  }, {
    ...personBase,
    id: "p-3",
  }];

  const imagesForPeople: IPersonWithImages[] = [{
    id: "p-1",
    imageIds: ["img-1", "img-2"],
  }, {
    id: "p-2",
    imageIds: ["img-1"],
  }, {
    id: "p-3",
    imageIds: [],
  }];

  const result = deleteFns.getUpdatedPeople(existingPeople, imagesForPeople);

  t.equal(result.length, 2, "updated people is 1 less than before");
  t.equal(result.find((person) => person.id === "p-3"), undefined, "person with id p-3 has been removed");
  t.end();
});

test("getUpdatedPeople does nothing to existing people if all people are in other images", (t) => {
  const existingPeople: IPerson[] = [{
    ...personBase,
    id: "p-1",
  }, {
    ...personBase,
    id: "p-2",
  }, {
    ...personBase,
    id: "p-3",
  }];

  const imagesForPeople: IPersonWithImages[] = [{
    id: "p-1",
    imageIds: ["img-1", "img-2"],
  }, {
    id: "p-2",
    imageIds: ["img-4"],
  }];

  const result = deleteFns.getUpdatedPeople(existingPeople, imagesForPeople);

  t.equal(result.length, 3, "updated people is same length");
  t.ok(result.find((person) => person.id === "p-1"), "p-1 remains");
  t.ok(result.find((person) => person.id === "p-2"), "p-2 remains");
  t.ok(result.find((person) => person.id === "p-3"), "p-3 remains");
  t.end();
});

test("getUpdatedPeople removes all existing people if all people are in no other images", (t) => {
  const existingPeople: IPerson[] = [{
    ...personBase,
    id: "p-1",
  }, {
    ...personBase,
    id: "p-2",
  }, {
    ...personBase,
    id: "p-3",
  }];

  const imagesForPeople: IPersonWithImages[] = [{
    id: "p-1",
    imageIds: [],
  }, {
    id: "p-2",
    imageIds: [],
  }, {
    id: "p-3",
    imageIds: [],
  }];

  const result = deleteFns.getUpdatedPeople(existingPeople, imagesForPeople);

  t.equal(result.length, 0, "updated people is empty");
  t.end();
});

test("getFaceIds - handles an empty faces array", (t) => {
  const imageWithNoFaces: IImage = {
    ...imageBase,
    faces: [],
  };

  const result = deleteFns.getFaceIds(imageWithNoFaces);

  t.equal(result.length, 0, "empty faceIds array");
  t.end();
});

test("getFaceIds - handles an faces array with Face objects that lack an id", (t) => {
  const imageWithNoFaceData: IImage = {
    ...imageBase,
    faces: [{
      Face: {},
    }],
  };

  const result = deleteFns.getFaceIds(imageWithNoFaceData);

  t.equal(result.length, 0, "empty faceIds array");
  t.end();
});
