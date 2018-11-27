import * as test from "tape";
import * as personThumb from "./personThumb";

import { EXIF_ORIENT } from "./lib/constants";

const person = {
  boundingBox: {
    Height: 0.3,
    Left: 0.55,
    Top: 0.2,
    Width: 0.4,
  },
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
