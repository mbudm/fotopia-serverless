import * as test from "tape";
import * as personThumb from "./personThumb";
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
  const result = personThumb.getDimsFromBounds(bounds, p);
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
  const result = personThumb.expandAndSqareUpDims(dims, p);
  t.equal(result.width, 110, "width");
  t.equal(result.height, 110, "height");
  t.equal(result.left, 5, "left");
  t.equal(result.top, 15, "top");
  t.end();
});

test("getDims", (t) => {
  const result = personThumb.getDims(person);
  t.equal(result.width, 264, "width");
  t.equal(result.height, 264, "height");
  t.equal(result.left, 468, "left");
  t.equal(result.top, 348, "top");
  t.end();
});

test("getDims - no landmarks", (t) => {
  const p = {
    boundingBox: {
      Height: 0.5, // 250 < 330
      Left: 0.2, // 200 - 15
      Top: 0.2, // 100 - 40
      Width: 0.3, // 330
    },
    imageDimensions: {
      height: 500,
      width: 1000,
    },
  };
  const result = personThumb.getDims(p);
  t.equal(result.width, 330, "width");
  t.equal(result.height, 330, "height");
  t.equal(result.left, 185, "left");
  t.equal(result.top, 60, "top");
  t.end();
});

test("getDims - no landmarks, negative bounds", (t) => {
  const p = {
    boundingBox: {
      Height: 0.5, // 250 ... 275
      Left: -0.2, // 0
      Top: 0.2, // 100 - 12.5 rounded - 13. 87
      Width: 0.3, // 300 - 200 = 100 < 250 so 275
    },
    imageDimensions: {
      height: 500,
      width: 1000,
    },
  };
  const result = personThumb.getDims(p);
  t.equal(result.width, 275, "width");
  t.equal(result.height, 275, "height");
  t.equal(result.left, 0, "left");
  t.equal(result.top, 87, "top");
  t.end();
});
