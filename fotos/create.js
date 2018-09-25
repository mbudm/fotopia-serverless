
import uuid from 'uuid';
import Joi from 'joi';
import { AttributeValue as ddbAttVals } from 'dynamodb-data-types';
import dynamodb from './lib/dynamodb';
import lambda from './lib/lambda';
import rekognition from './lib/rekognition';
import { success, failure } from './lib/responses';
import { requestSchema, ddbParamsSchema } from './joi/create';
import { INVOCATION_REQUEST_RESPONSE } from './lib/constants';
import logger from './lib/logger';

const fotopiaGroup = process.env.FOTOPIA_GROUP;
export const THUMB_SUFFIX = '-thumbnail';

export function replicateAuthKey(data) {
  return process.env.IS_OFFLINE ?
    data.img_key :
    `protected/${data.userIdentityId}/${data.img_key}`;
}

export function safeLength(arr) {
  return Array.isArray(arr) ? arr.length : 0;
}

export function getTagsFromRekognitionLabels(labels) {
  return labels && labels.Labels && Array.isArray(labels.Labels) ?
    labels.Labels.map(label => label.Name) :
    [];
}

export function getLogFields(request = {}, dbItem = {}, faces = [], labels = []) {
  return {
    imageId: dbItem.id,
    imageUsername: request.username,
    imageFamilyGroup: fotopiaGroup,
    imageKey: request.img_key,
    imageWidth: request.meta && request.meta.width,
    imageHeight: request.meta && request.meta.height,
    imageUserIdentityId: request.userIdentityId,
    imageBirthtime: request.birthtime,
    imageCreatedAt: dbItem.createdAt,
    imageUpdatedAt: dbItem.updatedAt,
    createIdentifiedFacesCount: safeLength(faces),
    createIdentifiedLabelsCount: safeLength(getTagsFromRekognitionLabels(labels)),
    createPayloadTagCount: safeLength(request.tags),
    imageFacesCount: safeLength(dbItem.faces),
    imageTagCount: safeLength(dbItem.tags),
  };
}

export function validateRequest(data) {
  const result = Joi.validate(data, requestSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return data;
  }
}

export function createThumbKey(key) {
  const keySplit = key.split('.');
  const ext = keySplit[keySplit.length - 1];
  return `${key.substr(0, key.lastIndexOf(ext) - 1)}${THUMB_SUFFIX}.${ext}`;
}

export function getInvokeThumbnailsParams(data) {
  const authKey = replicateAuthKey(data);
  return {
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    FunctionName: process.env.IS_OFFLINE ? 'thumbs' : `${process.env.LAMBDA_PREFIX}thumbs`,
    LogType: 'Tail',
    Payload: JSON.stringify({
      body: JSON.stringify({
        key: authKey,
        thumbKey: createThumbKey(authKey),
      }),
    }),
  };
}
export function getPeopleFromRekognitionFaces(faces) {
  return faces && faces.FaceRecords && Array.isArray(faces.FaceRecords) ?
    faces.FaceRecords.map(faceRecord => faceRecord.Face.FaceId) :
    [];
}

export function getDynamoDbParams(data, id, group, faces, labels) {
  const timestamp = new Date().getTime();

  const tags = [...data.tags, ...getTagsFromRekognitionLabels(labels)];

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      username: data.username,
      userIdentityId: data.userIdentityId,
      group,
      id,
      birthtime: new Date(data.birthtime).getTime(),
      tags,
      people: [],
      faces: (faces || []), // prob null from rekognition error, hack for now
      img_key: data.img_key, // s3 object key
      img_thumb_key: createThumbKey(data.img_key),
      meta: data.meta, // whatever metadata we've got for this item
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };

  const result = Joi.validate(params, ddbParamsSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return params;
  }
}

export function logRekognitionError(e, data, id, indexFacesParams, context, startTime) {
  if (e.code && e.code === 'ResourceNotFoundException') {
    const params = {
      CollectionId: fotopiaGroup,
    };
    return rekognition.createCollection(params)
      .promise()
      // eslint-disable-next-line
      .then(() => getRekognitionFaceData(data, id));
  }
  if (e.code && e.code === 'InvalidS3ObjectException') {
    logger(context, startTime, { err: e, ...getLogFields(data, { id }) });
  } else {
    logger(context, startTime, { err: e }, 'logRekognitionError');
  }
  return null;
}

export function getRekognitionFaceData(data, id, context, startTime) {
  const params = {
    CollectionId: fotopiaGroup,
    DetectionAttributes: [
    ],
    ExternalImageId: id,
    Image: {
      S3Object: {
        Bucket: process.env.S3_BUCKET,
        Name: replicateAuthKey(data),
      },
    },
  };
  return rekognition ?
    rekognition.indexFaces(params)
      .promise()
      .then(response => response.FaceRecords)
      .catch(e => logRekognitionError(e, data, id, params, context, startTime)) :
    [];
  // sometimes getting a object not found error - img
  // should be avail as create happens after upload is complete
  // perhaps everything should be evented?
}

export function getRekognitionLabelData(data) {
  const params = {
    Image: {
      S3Object: {
        Bucket: process.env.S3_BUCKET,
        Name: replicateAuthKey(data),
      },
    },
    MaxLabels: 30,
    MinConfidence: 80,
  };
  return rekognition ?
    rekognition.detectLabels(params)
      .promise()
      .catch(e => console.log('detectLabels error', e, params)) :
    [];
}

export function getInvokeParams(ddbParams, name) {
  return {
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    FunctionName: name,
    LogType: 'Tail',
    Payload: JSON.stringify({
      Records: [
        {
          dynamodb: {
            Keys: {
              id: {
                S: ddbParams.Item.id,
              },
              username: {
                S: ddbParams.Item.username,
              },
            },
            NewImage: ddbAttVals.wrap(ddbParams.Item),
          },
        },
      ],
    }),
  };
}

export async function createItem(event, context, callback) {
  const startTime = Date.now();
  const id = uuid.v1();
  const data = JSON.parse(event.body);
  try {
    const request = validateRequest(data);
    const invokeParams = getInvokeThumbnailsParams(request);
    const thumbPromise = lambda.invoke(invokeParams).promise();
    const facesPromise = getRekognitionFaceData(request, id, context, startTime);
    const labelsPromise = getRekognitionLabelData(request);

    await thumbPromise;
    const faces = await facesPromise;
    const labels = await labelsPromise;

    const ddbParams = getDynamoDbParams(request, id, fotopiaGroup, faces, labels);
    await dynamodb.put(ddbParams).promise();
    if (process.env.IS_OFFLINE) {
      const streamParams = getInvokeParams(ddbParams, 'stream');
      const streamPromise = lambda.invoke(streamParams).promise();
      const facesParams = getInvokeParams(ddbParams, 'faces');
      const facesLambdaPromise = lambda.invoke(facesParams).promise();
      await streamPromise;
      await facesLambdaPromise;
    }
    logger(context, startTime, getLogFields(request, ddbParams.Item, faces, labels));
    return callback(null, success(ddbParams.Item));
  } catch (err) {
    logger(context, startTime, { err, ...getLogFields(data, { id }) });
    return callback(null, failure(err));
  }
}

// getRekognitionFaceData response (3 faces)
// rekognitionData {
//   "FaceRecords": [
//     {
//       "Face": {
//         "FaceId": "f81bb045-9d24-4d0b-a928-b0267cbbd7c6",
//         "BoundingBox": {
//           "Width": 0.2835937440395355,
//           "Height": 0.37812501192092896,
//           "Left": 0.688281238079071,
//           "Top": 0.2291666716337204
//         },
//         "ImageId": "97d92ad3-5fc0-5e3d-8a5b-843192c336d6",
//         "ExternalImageId": "f41f1790-85c5-11e8-a44f-75727e620ae2",
//         "Confidence": 99.8944320678711
//       },
//       "FaceDetail": {
//         "BoundingBox": {
//           "Width": 0.2835937440395355,
//           "Height": 0.37812501192092896,
//           "Left": 0.688281238079071,
//           "Top": 0.2291666716337204
//         },
//         "Landmarks": [
//           {
//             "Type": "eyeLeft",
//             "X": 0.771110475063324,
//             "Y": 0.3896821439266205
//           },
//           {
//             "Type": "eyeRight",
//             "X": 0.8536998629570007,
//             "Y": 0.35018059611320496
//           },
//           {
//             "Type": "nose",
//             "X": 0.7962719798088074,
//             "Y": 0.42947378754615784
//           },
//           {
//             "Type": "mouthLeft",
//             "X": 0.7941058278083801,
//             "Y": 0.5068956017494202
//           },
//           {
//             "Type": "mouthRight",
//             "X": 0.8827072381973267,
//             "Y": 0.47168639302253723
//           }
//         ],
//         "Pose": {
//           "Roll": -18.639232635498047,
//           "Yaw": -23.584287643432617,
//           "Pitch": 7.67142391204834
//         },
//         "Quality": {
//           "Brightness": 57.94858169555664,
//           "Sharpness": 99.98487854003906
//         },
//         "Confidence": 99.8944320678711
//       }
//     },
//     {
//       "Face": {
//         "FaceId": "8b637e73-da25-4a2e-8e21-2cea38217fd6",
//         "BoundingBox": {
//           "Width": 0.24921874701976776,
//           "Height": 0.33125001192092896,
//           "Left": 0.07187499850988388,
//           "Top": 0.5260416865348816
//         },
//         "ImageId": "97d92ad3-5fc0-5e3d-8a5b-843192c336d6",
//         "ExternalImageId": "f41f1790-85c5-11e8-a44f-75727e620ae2",
//         "Confidence": 99.99999237060547
//       },
//       "FaceDetail": {
//         "BoundingBox": {
//           "Width": 0.24921874701976776,
//           "Height": 0.33125001192092896,
//           "Left": 0.07187499850988388,
//           "Top": 0.5260416865348816
//         },
//         "Landmarks": [
//           {
//             "Type": "eyeLeft",
//             "X": 0.17182907462120056,
//             "Y": 0.6531587839126587
//           },
//           {
//             "Type": "eyeRight",
//             "X": 0.24663801491260529,
//             "Y": 0.6492635607719421
//           },
//           {
//             "Type": "nose",
//             "X": 0.2337799072265625,
//             "Y": 0.729832649230957
//           },
//           {
//             "Type": "mouthLeft",
//             "X": 0.16631707549095154,
//             "Y": 0.769753098487854
//           },
//           {
//             "Type": "mouthRight",
//             "X": 0.24043841660022736,
//             "Y": 0.7613717317581177
//           }
//         ],
//         "Pose": {
//           "Roll": -4.630231857299805,
//           "Yaw": 32.88231658935547,
//           "Pitch": -14.734925270080566
//         },
//         "Quality": {
//           "Brightness": 36.554039001464844,
//           "Sharpness": 99.99671173095703
//         },
//         "Confidence": 99.99999237060547
//       }
//     },
//     {
//       "Face": {
//         "FaceId": "a6bce3a6-291c-4014-8d6b-19e8b53e2a14",
//         "BoundingBox": {
//           "Width": 0.17031249403953552,
//           "Height": 0.22708334028720856,
//           "Left": 0.569531261920929,
//           "Top": 0.5635416507720947
//         },
//         "ImageId": "97d92ad3-5fc0-5e3d-8a5b-843192c336d6",
//         "ExternalImageId": "f41f1790-85c5-11e8-a44f-75727e620ae2",
//         "Confidence": 99.98350524902344
//       },
//       "FaceDetail": {
//         "BoundingBox": {
//           "Width": 0.17031249403953552,
//           "Height": 0.22708334028720856,
//           "Left": 0.569531261920929,
//           "Top": 0.5635416507720947
//         },
//         "Landmarks": [
//           {
//             "Type": "eyeLeft",
//             "X": 0.6284952759742737,
//             "Y": 0.6364575028419495
//           },
//           {
//             "Type": "eyeRight",
//             "X": 0.6834288239479065,
//             "Y": 0.6475913524627686
//           },
//           {
//             "Type": "nose",
//             "X": 0.6536866426467896,
//             "Y": 0.683709442615509
//           },
//           {
//             "Type": "mouthLeft",
//             "X": 0.6290709972381592,
//             "Y": 0.7197924256324768
//           },
//           {
//             "Type": "mouthRight",
//             "X": 0.6764854788780212,
//             "Y": 0.7242391705513
//           }
//         ],
//         "Pose": {
//           "Roll": 8.2703857421875,
//           "Yaw": 1.2161580324172974,
//           "Pitch": 5.779657363891602
//         },
//         "Quality": {
//           "Brightness": 29.895315170288086,
//           "Sharpness": 99.97486114501953
//         },
//         "Confidence": 99.98350524902344
//       }
//     }
//   ],
//   "FaceModelVersion": "3.0"
// }


// rekognitionLabelData {
//   "Labels": [
//     {
//       "Name": "Human",
//       "Confidence": 99.29840850830078
//     },
//     {
//       "Name": "People",
//       "Confidence": 99.29840850830078
//     },
//     {
//       "Name": "Person",
//       "Confidence": 99.29840850830078
//     },
//     {
//       "Name": "Face",
//       "Confidence": 89.55351257324219
//     },
//     {
//       "Name": "Portrait",
//       "Confidence": 89.55351257324219
//     }
//   ]
// }
