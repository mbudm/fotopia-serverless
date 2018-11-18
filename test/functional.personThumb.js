
import test from 'tape';
import fs from 'fs';
import path from 'path';
import * as api from './local/api';
import upload from './local/upload';
import { formatError } from './functional';

const apiUrl = 'http://localhost:3000';
const username = 'tester';

const images = [
  '',
  'IMG_5178.JPG',
  'IMG_5287.JPG',
  '2011-02-18 12.52.57.jpg',
  'IMG_0181.JPG',
  'IMG_0299.jpg',
  '2011-03-08 16.34.33.jpg',
  '2011-02-11 11.09.37[0].jpg',
  'IMG_5184.JPG',
  'IMG_5195.JPG',
  'IMG_5102.JPG'];

const getPath = filename => path.resolve(__dirname, `./personThumbImages/${filename}`);
const getKey = filename => `${username}/${filename}`;


test('upload IMG_5178.JPG', (t) => {
  const object = fs.createReadStream(getPath(images[1]));
  upload(getKey(images[1]), object, {
    contentType: 'image/jpeg',
  })
    .then((responseBody) => {
      t.equal(responseBody.key, getKey(images[1]));
      t.end();
    })
    .catch(formatError);
});

test('peopleThumbs IMG_5178.JPG', (t) => {
  const person = {
    boundingBox: {
      Height: 0.9515151381492615,
      Left: 0.02525252476334572,
      Top: -0.006818181835114956,
      Width: 0.6343434453010559,
    },
    faces: [{ ExternalImageId: '0eed59f0-e8b9-11e8-878c-ed97461a27ab', FaceId: '224ad440-e038-4fb7-914f-e763b6287e53' }],
    id: '11994010-e8b9-11e8-9e49-4f9f5f07a8df',
    imageDimensions: { height: 2848, width: 4272 },
    img_key: 'tester/IMG_5178.JPG',
    landMarks: [{ Type: 'eyeLeft', X: 0.21824684739112854, Y: 0.3917418420314789 }, { Type: 'eyeRight', X: 0.36494582891464233, Y: 0.33749863505363464 }, { Type: 'nose', X: 0.21020366251468658, Y: 0.5218124985694885 }, { Type: 'mouthLeft', X: 0.26919084787368774, Y: 0.7370038628578186 }, { Type: 'mouthRight', X: 0.3647838830947876, Y: 0.7164779901504517 }],
    name: '',
    thumbnail: 'tester/IMG_5178-face--224ad440-e038-4fb7-914f-e763b6287e53.JPG',
    userIdentityId: 'us-east-1:bd054ff2-d394-496e-b602-d90103911209',
  };

  api.post(apiUrl, '/people/thumbs', {
    body: {
      person,
    },
  })
    .then((responseBody) => {
      t.deepEqual(responseBody, {
        height: 2848, left: 0, top: 0, width: 3413,
      }, 'responseBody');
      t.end();
    })
    .catch(formatError);
});


test('upload IMG_5287.JPG', (t) => {
  const object = fs.createReadStream(getPath(images[2]));
  upload(getKey(images[2]), object, {
    contentType: 'image/jpeg',
  })
    .then((responseBody) => {
      t.equal(responseBody.key, getKey(images[2]));
      t.end();
    })
    .catch(formatError);
});

test('peopleThumbs IMG_5287.JPG', (t) => {
  const person = {
    boundingBox: {
      Height: 0.3202020227909088,
      Left: 0.5522727370262146,
      Top: 0.21111111342906952,
      Width: 0.480303019285202,
    },
    faces: [{ ExternalImageId: '4f1c03f0-e8b9-11e8-878c-ed97461a27ab', FaceId: '692de635-2800-47ef-95d8-4347237e93e6' }],
    id: '510de8e0-e8b9-11e8-9e49-4f9f5f07a8df',
    imageDimensions: { height: 2848, width: 4272 },
    img_key: 'tester/IMG_5287.JPG',
    landMarks: [
      { Type: 'eyeLeft', X: 0.7106456160545349, Y: 0.33161160349845886 },
      { Type: 'eyeRight', X: 0.8959000110626221, Y: 0.3422655761241913 },
      { Type: 'nose', X: 0.7976943254470825, Y: 0.3895479440689087 },
      { Type: 'mouthLeft', X: 0.7262354493141174, Y: 0.4579300582408905 },
      { Type: 'mouthRight', X: 0.8470975160598755, Y: 0.46423783898353577 },
    ],
    name: '',
    thumbnail: 'tester/IMG_5287-face--692de635-2800-47ef-95d8-4347237e93e6.JPG',
    userIdentityId: 'us-east-1:bd054ff2-d394-496e-b602-d90103911209',
  };

  api.post(apiUrl, '/people/thumbs', {
    body: {
      person,
    },
  })
    .then((responseBody) => {
      t.deepEqual(responseBody, {
        height: 1700, left: 1438, top: 850, width: 1410,
      }, 'responseBody');
      t.end();
    })
    .catch(formatError);
});


test('upload 2011-02-18 12.52.57.jpg', (t) => {
  const object = fs.createReadStream(getPath(images[3]));
  upload(getKey(images[3]), object, {
    contentType: 'image/jpeg',
  })
    .then((responseBody) => {
      t.equal(responseBody.key, getKey(images[3]));
      t.end();
    })
    .catch(formatError);
});

test('peopleThumbs 2011-02-18 12.52.57.jpg', (t) => {
  const person = {
    boundingBox: {
      Height: 0.030833333730697632,
      Left: 0.24062499403953552,
      Top: 0.5316666960716248,
      Width: 0.023125000298023224,
    },
    faces: [{ ExternalImageId: '7f39ac40-e8b9-11e8-878c-ed97461a27ab', FaceId: '1008b82d-5306-4dd3-8e49-82915ac84bcc' }],
    id: '80b15820-e8b9-11e8-9e49-4f9f5f07a8df',
    imageDimensions: { height: 1920, width: 2560 },
    img_key: 'tester/2011-02-18 12.52.57.jpg',
    landMarks: [{ Type: 'eyeLeft', X: 0.24854591488838196, Y: 0.5441654920578003 }, { Type: 'eyeRight', X: 0.2562781572341919, Y: 0.5432841777801514 }, { Type: 'nose', X: 0.2531391978263855, Y: 0.5487431287765503 }, { Type: 'mouthLeft', X: 0.2505328059196472, Y: 0.5555432438850403 }, { Type: 'mouthRight', X: 0.25715067982673645, Y: 0.5550625324249268 }],
    name: '',
    thumbnail: 'tester/2011-02-18 12.52.57-face--1008b82d-5306-4dd3-8e49-82915ac84bcc.jpg',
    userIdentityId: 'us-east-1:bd054ff2-d394-496e-b602-d90103911209',
  };

  api.post(apiUrl, '/people/thumbs', {
    body: {
      person,
    },
  })
    .then((responseBody) => {
      t.deepEqual(responseBody, {
        height: 71, left: 612, top: 1019, width: 71,
      }, 'responseBody');
      t.end();
    })
    .catch(formatError);
});


test('upload IMG_0181.JPG', (t) => {
  const object = fs.createReadStream(getPath(images[4]));
  upload(getKey(images[4]), object, {
    contentType: 'image/jpeg',
  })
    .then((responseBody) => {
      t.equal(responseBody.key, getKey(images[4]));
      t.end();
    })
    .catch(formatError);
});

test('peopleThumbs IMG_0181.JPG', (t) => {
  const person = {
    boundingBox: {
      Height: 0.12111110985279083,
      Left: 0.23407407104969025,
      Top: 0.013333333656191826,
      Width: 0.16148148477077484,
    },
    faces: [{ ExternalImageId: '65c8f450-e73d-11e8-bdf6-675b6855f9ea', FaceId: '5e6d7614-290e-4555-8fd3-b07181b1b964' }],
    id: '673d1dc0-e73d-11e8-959d-23eb13fc62a6',
    imageDimensions: { height: 800, width: 600 },
    img_key: 'tester/IMG_0181.JPG',
    landMarks: [{ Type: 'eyeLeft', X: 0.317627489566803, Y: 0.05844716727733612 }, { Type: 'eyeRight', X: 0.32313233613967896, Y: 0.05828847363591194 }, { Type: 'nose', X: 0.3425184488296509, Y: 0.07839545607566833 }, { Type: 'mouthLeft', X: 0.3147720992565155, Y: 0.10535036027431488 }, { Type: 'mouthRight', X: 0.32430121302604675, Y: 0.10457809269428253 }],
    name: '',
    thumbnail: 'tester/IMG_0181-face--5e6d7614-290e-4555-8fd3-b07181b1b964.JPG',
    userIdentityId: 'us-east-1:8705ff8e-0c46-46e7-b969-baebe2a384fb',
  };

  api.post(apiUrl, '/people/thumbs', {
    body: {
      person,
    },
  })
    .then((responseBody) => {
      t.deepEqual(responseBody, {
        height: 113, left: 141, top: 9, width: 113,
      }, 'responseBody');
      t.end();
    })
    .catch(formatError);
});


test('upload IMG_0299.JPG', (t) => {
  const object = fs.createReadStream(getPath(images[5]));
  upload(getKey(images[5]), object, {
    contentType: 'image/jpeg',
  })
    .then((responseBody) => {
      t.equal(responseBody.key, getKey(images[5]));
      t.end();
    })
    .catch(formatError);
});

test('peopleThumbs IMG_0299.JPG', (t) => {
  const person = {
    boundingBox: {
      Height: 0.09125000238418579,
      Left: 0.3799999952316284,
      Top: 0.2931250035762787,
      Width: 0.12166666984558105,
    },
    faces: [{ ExternalImageId: '74f64890-e744-11e8-bdf6-675b6855f9ea', FaceId: '63acf58b-b9e7-40ef-a9db-680a2dbd0151' }],
    id: '770c5750-e744-11e8-959d-23eb13fc62a6',
    imageDimensions: { height: 1200, width: 1600 }, // reverse to what sharp reads!
    img_key: 'tester/IMG_0299.jpg',
    landMarks: [
      { Type: 'eyeLeft', X: 0.4184637665748596, Y: 0.32708561420440674 },
      { Type: 'eyeRight', X: 0.4592348635196686, Y: 0.3320315182209015 },
      { Type: 'nose', X: 0.4223265051841736, Y: 0.342204213142395 },
      { Type: 'mouthLeft', X: 0.4213716983795166, Y: 0.3608948886394501 },
      { Type: 'mouthRight', X: 0.45048990845680237, Y: 0.36425840854644775 },
    ],
    name: '',
    thumbnail: 'tester/IMG_0299-face--63acf58b-b9e7-40ef-a9db-680a2dbd0151.jpg',
    userIdentityId: 'us-east-1:8705ff8e-0c46-46e7-b969-baebe2a384fb',
  };

  api.post(apiUrl, '/people/thumbs', {
    body: {
      person,
    },
  })
    .then((responseBody) => {
      t.deepEqual(responseBody, {
        height: 178, left: 438, top: 464, width: 178,
      }, 'responseBody');
      t.end();
    })
    .catch(formatError);
});


// '2011-03-08 16.34.33.jpg',

test('upload 2011-03-08 16.34.33.jpg', (t) => {
  const object = fs.createReadStream(getPath(images[6]));
  upload(getKey(images[6]), object, {
    contentType: 'image/jpeg',
  })
    .then((responseBody) => {
      t.equal(responseBody.key, getKey(images[6]));
      t.end();
    })
    .catch(formatError);
});

test('peopleThumbs 2011-03-08 16.34.33.jpg', (t) => {
  const person = {
    boundingBox: {
      Height: 0.2660256326198578,
      Left: 0.4507211446762085,
      Top: 0.2003205120563507,
      Width: 0.19951923191547394,
    },
    faces: [{ ExternalImageId: '0ed34af0-e748-11e8-a1fe-950ad3f02d6e', FaceId: '7e54f021-ad93-4925-a5b9-f5776b2e24ea' }],
    id: '10629d80-e748-11e8-959d-23eb13fc62a6',
    imageDimensions: {},
    img_key: 'tester/2011-03-08 16.34.33.jpg',
    landMarks: [{ Type: 'eyeLeft', X: 0.5203984975814819, Y: 0.2973889410495758 }, { Type: 'eyeRight', X: 0.5931680202484131, Y: 0.3126296103000641 }, { Type: 'nose', X: 0.5503991842269897, Y: 0.3580031991004944 }, { Type: 'mouthLeft', X: 0.5196753740310669, Y: 0.4044731855392456 }, { Type: 'mouthRight', X: 0.5690034031867981, Y: 0.41630202531814575 }],
    name: '',
    thumbnail: 'tester/2011-03-08 16.34.33-face--7e54f021-ad93-4925-a5b9-f5776b2e24ea.jpg',
    userIdentityId: 'us-east-1:8705ff8e-0c46-46e7-b969-baebe2a384fb',
  };

  api.post(apiUrl, '/people/thumbs', {
    body: {
      person,
    },
  })
    .then((responseBody) => {
      t.deepEqual(responseBody, {
        height: 171, left: 271, top: 86, width: 171,
      }, 'responseBody');
      t.end();
    })
    .catch(formatError);
});


// '2011-02-11 11.09.37[0].jpg',

test('upload 2011-02-11 11.09.37[0].jpg', (t) => {
  const object = fs.createReadStream(getPath(images[7]));
  upload(getKey(images[7]), object, {
    contentType: 'image/jpeg',
  })
    .then((responseBody) => {
      t.equal(responseBody.key, getKey(images[7]));
      t.end();
    })
    .catch(formatError);
});

test('peopleThumbs 2011-02-11 11.09.37[0].jpg', (t) => {
  const people = [{
    boundingBox: {
      Height: 0.12339743226766586,
      Left: 0.7487980723381042,
      Top: 0.036858975887298584,
      Width: 0.09254807978868484,
    },
    faces: [{ ExternalImageId: '51f1c940-e745-11e8-be21-dd8825657520', FaceId: '1c8ad7d9-7e9c-448c-9bc7-c07cbafa697a' }],
    id: '52f83cc0-e745-11e8-959d-23eb13fc62a6',
    imageDimensions: {},
    img_key: 'tester/2011-02-11 11.09.37[0].jpg',
    landMarks: [{ Type: 'eyeLeft', X: 0.7807751893997192, Y: 0.08210083097219467 }, { Type: 'eyeRight', X: 0.8148456811904907, Y: 0.09312696754932404 }, { Type: 'nose', X: 0.7904192209243774, Y: 0.11383534967899323 }, { Type: 'mouthLeft', X: 0.7734729051589966, Y: 0.12488206475973129 }, { Type: 'mouthRight', X: 0.8071706891059875, Y: 0.13484737277030945 }],
    name: '',
    thumbnail: 'tester/2011-02-11 11.09.37[0]-face--1c8ad7d9-7e9c-448c-9bc7-c07cbafa697a.jpg',
    userIdentityId: 'us-east-1:8705ff8e-0c46-46e7-b969-baebe2a384fb',
  }, {
    boundingBox: {
      Height: 0.08493589609861374,
      Left: 0.6334134340286255,
      Top: 0.07532051205635071,
      Width: 0.06490384787321091,
    },
    faces: [{ ExternalImageId: '51f1c940-e745-11e8-be21-dd8825657520', FaceId: '2e036075-62fa-4275-acdf-a577b8613cb6' }],
    id: '52f83cc1-e745-11e8-959d-23eb13fc62a6',
    imageDimensions: {},
    img_key: 'tester/2011-02-11 11.09.37[0].jpg',
    landMarks: [{ Type: 'eyeLeft', X: 0.654455304145813, Y: 0.1148969978094101 }, { Type: 'eyeRight', X: 0.674835741519928, Y: 0.12100327759981155 }, { Type: 'nose', X: 0.6587437987327576, Y: 0.1350855827331543 }, { Type: 'mouthLeft', X: 0.6581385135650635, Y: 0.1448759287595749 }, { Type: 'mouthRight', X: 0.6720491051673889, Y: 0.14795662462711334 }],
    name: '',
    thumbnail: 'tester/2011-02-11 11.09.37[0]-face--2e036075-62fa-4275-acdf-a577b8613cb6.jpg',
    userIdentityId: 'us-east-1:8705ff8e-0c46-46e7-b969-baebe2a384fb',
  }];

  t.plan(2);

  api.post(apiUrl, '/people/thumbs', {
    body: {
      person: people[0],
    },
  })
    .then((responseBody) => {
      t.deepEqual(responseBody, {
        height: 79, left: 469, top: 13, width: 79,
      }, 'responseBody');
    })
    .catch(formatError);

  api.post(apiUrl, '/people/thumbs', {
    body: {
      person: people[1],
    },
  })
    .then((responseBody) => {
      t.deepEqual(responseBody, {
        height: 48, left: 401, top: 39, width: 48,
      }, 'responseBody');
    })
    .catch(formatError);
});

// 'IMG_5184.JPG',

test('upload IMG_5184.JPG', (t) => {
  const object = fs.createReadStream(getPath(images[8]));
  upload(getKey(images[8]), object, {
    contentType: 'image/jpeg',
  })
    .then((responseBody) => {
      t.equal(responseBody.key, getKey(images[8]));
      t.end();
    })
    .catch(formatError);
});

test('peopleThumbs IMG_5184.JPG', (t) => {
  const person = {
    boundingBox: {
      Height: 0.19393938779830933,
      Left: 0.3015151619911194,
      Top: 0.07727272808551788,
      Width: 0.290909081697464,
    },
    faces: [{ ExternalImageId: 'f9a26c00-e73e-11e8-bdf6-675b6855f9ea', FaceId: '3d519a0d-38dc-4fce-85a7-fcd60c7df8ca' }],
    id: 'fb855cd0-e73e-11e8-959d-23eb13fc62a6',
    imageDimensions: { height: 2848, width: 4272 },
    img_key: 'tester/IMG_5184.JPG',
    landMarks: [{ Type: 'eyeLeft', X: 0.3967800736427307, Y: 0.15808381140232086 }, { Type: 'eyeRight', X: 0.472261518239975, Y: 0.1498555690050125 }, { Type: 'nose', X: 0.42047587037086487, Y: 0.1875104308128357 }, { Type: 'mouthLeft', X: 0.41617122292518616, Y: 0.22922451794147491 }, { Type: 'mouthRight', X: 0.48183658719062805, Y: 0.2229016274213791 }],
    name: '',
    thumbnail: 'tester/IMG_5184-face--3d519a0d-38dc-4fce-85a7-fcd60c7df8ca.JPG',
    userIdentityId: 'us-east-1:8705ff8e-0c46-46e7-b969-baebe2a384fb',
  };

  api.post(apiUrl, '/people/thumbs', {
    body: {
      person,
    },
  })
    .then((responseBody) => {
      t.deepEqual(responseBody, {
        height: 1017, left: 743, top: 301, width: 1017,
      }, 'responseBody');
      t.end();
    })
    .catch(formatError);
});

// 'IMG_5195.JPG',

test('upload IMG_5195.JPG', (t) => {
  const object = fs.createReadStream(getPath(images[9]));
  upload(getKey(images[9]), object, {
    contentType: 'image/jpeg',
  })
    .then((responseBody) => {
      t.equal(responseBody.key, getKey(images[9]));
      t.end();
    })
    .catch(formatError);
});

test('peopleThumbs IMG_5195.JPG', (t) => {
  const person = {
    boundingBox: {
      Height: 0.1368686854839325,
      Left: 0.4174242317676544,
      Top: 0.10101009905338287,
      Width: 0.20530302822589874,
    },
    faces: [{ ExternalImageId: '82b5ab60-e73f-11e8-bdf6-675b6855f9ea', FaceId: '4f2d3f5e-bf11-483d-8000-5c870dacb5e5' }],
    id: '84742440-e73f-11e8-959d-23eb13fc62a6',
    imageDimensions: { height: 2848, width: 4272 },
    img_key: 'tester/IMG_5195.JPG',
    landMarks: [{ Type: 'eyeLeft', X: 0.4717758595943451, Y: 0.15128810703754425 }, { Type: 'eyeRight', X: 0.5398473739624023, Y: 0.1467871069908142 }, { Type: 'nose', X: 0.4973805248737335, Y: 0.1792473942041397 }, { Type: 'mouthLeft', X: 0.4921362102031708, Y: 0.19644282758235931 }, { Type: 'mouthRight', X: 0.5531346201896667, Y: 0.1902041882276535 }],
    name: '',
    thumbnail: 'tester/IMG_5195-face--4f2d3f5e-bf11-483d-8000-5c870dacb5e5.JPG',
    userIdentityId: 'us-east-1:8705ff8e-0c46-46e7-b969-baebe2a384fb',
  };

  api.post(apiUrl, '/people/thumbs', {
    body: {
      person,
    },
  })
    .then((responseBody) => {
      t.deepEqual(responseBody, {
        height: 695, left: 1112, top: 386, width: 695,
      }, 'responseBody');
      t.end();
    })
    .catch(formatError);
});

// 'IMG_5102.JPG'];

test('upload IMG_5102.JPG', (t) => {
  const object = fs.createReadStream(getPath(images[10]));
  upload(getKey(images[10]), object, {
    contentType: 'image/jpeg',
  })
    .then((responseBody) => {
      t.equal(responseBody.key, getKey(images[10]));
      t.end();
    })
    .catch(formatError);
});

test('peopleThumbs IMG_5102.JPG', (t) => {
  const person = {
    boundingBox: {
      Height: 0.22727273404598236,
      Left: 0.15303030610084534,
      Top: 0.1792929321527481,
      Width: 0.34090909361839294,
    },
    faces: [{ ExternalImageId: 'b74614d0-e8b8-11e8-878c-ed97461a27ab', FaceId: '0cb9e2f2-634b-4654-88a6-e7113098ceb0' }],
    id: 'bbe16ee0-e8b8-11e8-9e49-4f9f5f07a8df',
    imageDimensions: { height: 2848, width: 4272 },
    img_key: 'tester/IMG_5102.JPG',
    landMarks: [{ Type: 'eyeLeft', X: 0.2755873203277588, Y: 0.2704360783100128 }, { Type: 'eyeRight', X: 0.3858790695667267, Y: 0.25940224528312683 }, { Type: 'nose', X: 0.36730313301086426, Y: 0.3207150995731354 }, { Type: 'mouthLeft', X: 0.2741638422012329, Y: 0.3484114110469818 }, { Type: 'mouthRight', X: 0.3821982145309448, Y: 0.34000590443611145 }],
    name: '',
    thumbnail: 'tester/IMG_5102-face--0cb9e2f2-634b-4654-88a6-e7113098ceb0.JPG',
    userIdentityId: 'us-east-1:bd054ff2-d394-496e-b602-d90103911209',
  };

  api.post(apiUrl, '/people/thumbs', {
    body: {
      person,
    },
  })
    .then((responseBody) => {
      t.deepEqual(responseBody, {
        height: 1141, left: 369, top: 728, width: 1141,
      }, 'responseBody');
      t.end();
    })
    .catch(formatError);
});
