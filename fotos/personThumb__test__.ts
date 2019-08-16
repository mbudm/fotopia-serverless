import * as test from "tape";
import * as personThumb from "./personThumb";

import { EXIF_ORIENT } from "./lib/constants";
import { IFace, IImage, IPerson } from "./types";

const person: IPerson = {
  boundingBox: {
    Height: 0.3,
    Left: 0.55,
    Top: 0.2,
    Width: 0.4,
  },
  faces: [],
  id: "c8ba6df0-9a12-11e8-a9e0-cb0dc753a59b",
  imageDimensions: {
    height: 1200,
    width: 800,
  },
  img_key: "tester/two.jpg",
  landMarks: [
    {
      Type: "eyeLeft",
      X: 0.7,
      Y: 0.3,
    },
    {
      Type: "eyeRight",
      X: 0.8,
      Y: 0.3,
    },
    {
      Type: "nose",
      X: 0.74,
      Y: 0.38,
    },
    {
      Type: "mouthLeft",
      X: 0.72,
      Y: 0.5,
    },
    {
      Type: "mouthRight",
      X: 0.78,
      Y: 0.48,
    },
  ],
  name: "",
  thumbnail: "tester/two-suffix.jpg",
  userIdentityId: "fakeid",
};

test("getBounds", (t) => {
  const result = personThumb.getBounds(person);
  t.equal(result.bottom, 0.5, "bottom");
  t.equal(result.left, 0.7, "left");
  t.equal(result.right, 0.8, "right");
  t.equal(result.top, 0.3, "top");
  t.end();
});

test("getDimsFromBounds", (t) => {
  const bounds = {
    bottom: 0.7,
    left: 0.1,
    right: 0.5,
    top: 0.3,
  };
  const p = {
    imageDimensions: {
      height: 100,
      width: 200,
    },
  };
  const result = personThumb.getDimsFromBounds(bounds, p.imageDimensions);
  t.equal(result.height, 40, "height");
  t.equal(result.left, 20, "left");
  t.equal(result.width, 80, "width");
  t.equal(result.top, 30, "top");
  t.end();
});

test("expandAndSqareUpDims", (t) => {
  const dims = {
    height: 100,
    left: 20,
    top: 20,
    width: 80,
  };
  const p = {
    imageDimensions: {
      height: 150,
      width: 200,
    },
  };
  const result = personThumb.expandAndSqareUpDims(dims, p, p.imageDimensions);
  t.equal(result.width, 100, "width");
  t.equal(result.height, 100, "height");
  t.equal(result.left, 10, "left");
  t.equal(result.top, 20, "top");
  t.end();
});

test("getDims", (t) => {
  const result = personThumb.getDims(person, { orientation: EXIF_ORIENT.TOP_LEFT });
  t.equal(result.width, 560, "width"); // edge of image is 800
  t.equal(result.height, 720, "height");
  t.equal(result.left, 240, "left");
  t.equal(result.top, 120, "top");
  t.end();
});

test("getDims - no landmarks", (t) => {
  const p = {
    boundingBox: {
      Height: 0.2, // 100
      Left: 0.2, // 200 - 25
      Top: 0.2, // 100
      Width: 0.05, // 50  ... 100
    },
    imageDimensions: {
      height: 500,
      width: 1000,
    },
  };
  const result = personThumb.getDims(p, { orientation: EXIF_ORIENT.TOP_LEFT });
  t.equal(result.width, 100, "width");
  t.equal(result.height, 100, "height");
  t.equal(result.left, 175, "left");
  t.equal(result.top, 100, "top");
  t.end();
});

test("getDims - no landmarks, negative bounds", (t) => {
  const p = {
    boundingBox: {
      Height: 0.5, // 250
      Left: -0.2, // 0
      Top: 0.2, // 100
      Width: 0.3, // 300 - 200 = 100 < 250 so 250
    },
    imageDimensions: {
      height: 500,
      width: 1000,
    },
  };
  const result = personThumb.getDims(p, { orientation: EXIF_ORIENT.TOP_LEFT });
  t.equal(result.width, 250, "width");
  t.equal(result.height, 250, "height");
  t.equal(result.left, 0, "left");
  t.equal(result.top, 100, "top");
  t.end();
});

test("orientation 2 - TOP_RIGHT", (t) => {
  const p = {
    boundingBox: {
      Height: 0.2,
      Left: 0.1,
      Top: 0.1,
      Width: 0.2,
    },
    imageDimensions: {
      height: 1000,
      width: 600,
    },
  };
  const result = personThumb.getDims(p, { orientation: EXIF_ORIENT.TOP_RIGHT });
  t.equal(result.width, 200, "width");
  t.equal(result.height, 200, "height");
  t.equal(result.left, 20, "left");
  t.equal(result.top, 100, "top");
  t.end();
});

test("orientation 5 - LEFT_TOP", (t) => {
  const p = {
    boundingBox: {
      Height: 0.2,
      Left: 0.1,
      Top: 0.1,
      Width: 0.2,
    },
    imageDimensions: {
      height: 1000,
      width: 600,
    },
  };
  const result = personThumb.getDims(p, { orientation: EXIF_ORIENT.LEFT_TOP });
  t.equal(result.width, 200, "width");
  t.equal(result.height, 200, "height");
  t.equal(result.left, 100, "left");
  t.equal(result.top, 20, "top");
  t.end();
});

const imageFourPeopleRaw: IImage = {
  birthtime: 123,
  faces: [
    {
      Face: {
        BoundingBox: {
          Height: 0.2512778639793396,
          Left: 0.236151784658432,
          Top: 0.37818941473960876,
          Width: 0.09541566669940948,
        },
        Confidence: 100,
        ExternalImageId: "2af02bc0-bfcb-11e9-bcd6-27a389d204ef",
        FaceId: "e75f56bf-07a0-4436-bc80-86556f2a440c",
        ImageId: "5ad20044-7a12-351e-9cce-68699c6a59d0",
      },
    },
    {
      Face: {
        BoundingBox: {
          Height: 0.22840560972690582,
          Left: 0.3702377676963806,
          Top: 0.2149808704853058,
          Width: 0.07928548008203506,
        },
        Confidence: 100,
        ExternalImageId: "2af02bc0-bfcb-11e9-bcd6-27a389d204ef",
        FaceId: "be08fa8a-46a2-4e30-99ef-a00a1fc83d64",
        ImageId: "5ad20044-7a12-351e-9cce-68699c6a59d0",
      },
    },
    {
      Face: {
        BoundingBox: {
          Height: 0.22832465171813965,
          Left: 0.4967665672302246,
          Top: 0.17889449000358582,
          Width: 0.06599054485559464,
        },
        Confidence: 99.99993896484375,
        ExternalImageId: "2af02bc0-bfcb-11e9-bcd6-27a389d204ef",
        FaceId: "150f9228-41ba-4f84-916d-95a5d56b6e0f",
        ImageId: "5ad20044-7a12-351e-9cce-68699c6a59d0",
      },
    },
    {
      Face: {
        BoundingBox: {
          Height: 0.16665689647197723,
          Left: 0.6325252056121826,
          Top: 0.2243027687072754,
          Width: 0.05986156687140465,
        },
        Confidence: 99.99998474121094,
        ExternalImageId: "2af02bc0-bfcb-11e9-bcd6-27a389d204ef",
        FaceId: "a582a54b-c50b-4f91-bef1-afcaf882f7c6",
        ImageId: "5ad20044-7a12-351e-9cce-68699c6a59d0",
      },
    },
  ],
  group: "a-team",
  id: "4ppl",
  img_key: "ahoy.png",
  meta: {
    height: 654,
    width: 1359,
  },
  userIdentityId: "blah",
  username: "yah",
};

const fourPeople: IPerson[] = imageFourPeopleRaw.faces!.map((face) => ({
  boundingBox: {
    ...face.Face!.BoundingBox!,
  },
  faces: [] as IFace[],
  id: face.Face!.FaceId!,
  imageDimensions: {
    ...imageFourPeopleRaw.meta,
  },
  img_key: "doesntmatter.png",
  name: "",
  thumbnail: "doesntmatter.jpg",
  userIdentityId: "some-id",
}));

test("getDims - image with four people", (t) => {
  fourPeople.forEach((p) => {
    const result = personThumb.getDims(p, { orientation: EXIF_ORIENT.TOP_LEFT });
    // t.equal(result.width, 560, `width ${p.id}`);
    // t.equal(result.height, 720, `height ${p.id}`);
    // t.equal(result.left, 240, `left ${p.id}`);
    // t.equal(result.top, 120, `top ${p.id}`);
    t.ok(result, `ok ${p.id}`);
  });
  t.end();
});
