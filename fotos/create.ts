
import { AttributeValue as ddbAttVals } from "dynamodb-data-types";
import * as uuid from "uuid";
import { IndexFacesError } from "./errors/indexFaces";
import { INVOCATION_EVENT, INVOCATION_REQUEST_RESPONSE } from "./lib/constants";
import dynamodb from "./lib/dynamodb";
import lambda from "./lib/lambda";
import logger from "./lib/logger";
import rekognition from "./lib/rekognition";
import { failure, success } from "./lib/responses";
import {
  ICreateBody,
  ILoggerBaseParams,
  ILoggerCreateParams,
  ITraceMeta,
} from "./types";

const fotopiaGroup = process.env.FOTOPIA_GROUP || "";
export const THUMB_SUFFIX = "-thumbnail";

export function replicateAuthKey(imgKey, userIdentityId) {
  return process.env.IS_OFFLINE ?
    imgKey :
    `protected/${userIdentityId}/${imgKey}`;
}

export function safeLength(arr) {
  return Array.isArray(arr) ? arr.length : 0;
}

export function getTagsFromRekognitionLabels(labels) {
  return labels && labels.Labels && Array.isArray(labels.Labels) ?
    labels.Labels.map((label) => label.Name) :
    [];
}
export function getTraceMeta(loggerBaseParams: ILoggerBaseParams): ITraceMeta {
  return {
    parentId: loggerBaseParams.id,
    traceId: loggerBaseParams.traceId,
  };
}

export function getLogFields(request, dbItem, faces, labels): ILoggerCreateParams {
  return {
    createIdentifiedFacesCount: safeLength(faces),
    createIdentifiedLabelsCount: safeLength(getTagsFromRekognitionLabels(labels)),
    createPayloadTagCount: safeLength(request.tags),
    imageBirthtime: dbItem && dbItem.birthtime || request.birthtime,
    imageCreatedAt: dbItem && dbItem.createdAt,
    imageFacesCount: safeLength(dbItem.faces),
    imageFamilyGroup: fotopiaGroup,
    imageHeight: request.meta && request.meta.height,
    imageId: dbItem && dbItem.id,
    imageKey: request.img_key,
    imageTagCount: safeLength(dbItem.tags),
    imageUpdatedAt: dbItem && dbItem.updatedAt,
    imageUserIdentityId: request.userIdentityId,
    imageUsername: request.username,
    imageWidth: request.meta && request.meta.width,
  };
}

export function validateRequest(data) {
  return data;
}

export function createThumbKey(key) {
  const keySplit = key.split(".");
  const ext = keySplit[keySplit.length - 1];
  return `${key.substr(0, key.lastIndexOf(ext) - 1)}${THUMB_SUFFIX}.${ext}`;
}

export function getInvokeThumbnailsParams(data, loggerBaseParams: ILoggerBaseParams) {
  const authKey = replicateAuthKey(data.img_key, data.userIdentityId);
  return {
    FunctionName: process.env.IS_OFFLINE ? "thumbs" : `${process.env.LAMBDA_PREFIX}thumbs`,
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    LogType: "Tail",
    Payload: JSON.stringify({
      body: JSON.stringify({
        thumb: {
          key: authKey,
          thumbKey: createThumbKey(authKey),
        },
        traceMeta: getTraceMeta(loggerBaseParams),
      }),
    }),
  };
}
export function getPeopleFromRekognitionFaces(faces) {
  return faces && faces.FaceRecords && Array.isArray(faces.FaceRecords) ?
    faces.FaceRecords.map((faceRecord) => faceRecord.Face.FaceId) :
    [];
}

export function getDynamoDbParams(data, id, group, faces, labels) {
  const timestamp = new Date().getTime();

  const tags = [...data.tags, ...getTagsFromRekognitionLabels(labels)];

  return {
    Item: {
      birthtime: new Date(data.birthtime).getTime(),
      createdAt: timestamp,
      faces: (faces || []), // prob null from rekognition error, hack for now
      group,
      id,
      img_key: data.img_key, // s3 object key
      img_thumb_key: createThumbKey(data.img_key),
      meta: data.meta, // whatever metadata we've got for this item
      people: [],
      tags,
      updatedAt: timestamp,
      userIdentityId: data.userIdentityId,
      username: data.username,
    },
    TableName: process.env.DYNAMODB_TABLE || "",
  };
}

export function logRekognitionError(e, data, id, indexFacesParams, context, loggerBaseParams) {
  if (e.code && e.code === "ResourceNotFoundException") {
    const params = {
      CollectionId: fotopiaGroup,
    };
    return rekognition.createCollection(params)
      .promise()
      // eslint-disable-next-line
      .then(() => getRekognitionFaceData(data, id, context, loggerBaseParams));
  }
  const err =  new IndexFacesError(e, indexFacesParams);
  logger(context, {...loggerBaseParams, name: "logRekognitionError" }, { err, ...getLogFields(data, { id }, [], []) });
  return null;
}

export function getRekognitionFaceData(data, id, context, loggerBaseParams: ILoggerBaseParams) {
  const params = {
    CollectionId: fotopiaGroup,
    DetectionAttributes: [
    ],
    ExternalImageId: id,
    Image: {
      S3Object: {
        Bucket: process.env.S3_BUCKET,
        Name: replicateAuthKey(data.img_key, data.userIdentityId),
      },
    },
  };
  return rekognition ?
    rekognition.indexFaces(params)
      .promise()
      .then((response) => response.FaceRecords)
      .catch((e) => logRekognitionError(e, data, id, params, context, loggerBaseParams)) :
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
        Name: replicateAuthKey(data.img_key, data.userIdentityId),
      },
    },
    MaxLabels: 30,
    MinConfidence: 80,
  };
  return rekognition ?
    rekognition.detectLabels(params)
      .promise() :
    [];
}

export function getInvokeFacesParams(ddbParams, loggerBaseParams: ILoggerBaseParams) {
  return {
    FunctionName: process.env.IS_OFFLINE ? "faces" : `${process.env.LAMBDA_PREFIX}faces`,
    InvocationType: INVOCATION_EVENT,
    LogType: "Tail",
    Payload: JSON.stringify({
      body: JSON.stringify({
        image: ddbParams.Item,
        traceMeta: getTraceMeta(loggerBaseParams),
      }),
    }),
  };
}

export function getInvokeStreamParams(ddbParams) {
  return {
    FunctionName: "stream",
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    LogType: "Tail",
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
  const data: ICreateBody = JSON.parse(event.body);
  const loggerBaseParams: ILoggerBaseParams = {
    Timestamp: startTime,
    id: uuid.v1(),
    name: "createItem",
    parentId: null,
    traceId: uuid.v1(),
  };
  try {
    const invokeParams = getInvokeThumbnailsParams(data, loggerBaseParams);
    const thumbPromise = lambda.invoke(invokeParams).promise();
    const facesPromise = getRekognitionFaceData(data, id, context, loggerBaseParams);
    const labelsPromise = getRekognitionLabelData(data);

    await thumbPromise;
    const faces = await facesPromise;
    const labels = await labelsPromise;

    const ddbParams = getDynamoDbParams(data, id, fotopiaGroup, faces, labels);
    await dynamodb.put(ddbParams).promise();

    const facesParams = getInvokeFacesParams(ddbParams, loggerBaseParams);
    lambda.invoke(facesParams).promise();

    if (process.env.IS_OFFLINE) {
      const streamParams = getInvokeStreamParams(ddbParams);
      const streamPromise = lambda.invoke(streamParams).promise();
      await streamPromise;
    }
    logger(context, loggerBaseParams, getLogFields(data, ddbParams.Item, faces, labels));
    return callback(null, success(ddbParams.Item));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(data, { id }, [], []) });
    return callback(null, failure(err));
  }
}
