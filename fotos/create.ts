
import { APIGatewayProxyEvent, Callback , Context } from "aws-lambda";
import { AWSError } from "aws-sdk";
import { InvocationRequest } from "aws-sdk/clients/lambda";
import {
  DetectLabelsRequest,
  DetectLabelsResponse,
  FaceRecord,
  IndexFacesRequest,
  IndexFacesResponse,
} from "aws-sdk/clients/rekognition";
import {
  DocumentClient as DocClient,
} from "aws-sdk/lib/dynamodb/document_client.d";
import * as uuid from "uuid";
import * as uuidv5 from "uuid/v5";
import getTableName from "./common/getTableName";
import { getTraceMeta } from "./common/getTraceMeta";
import { failure, success } from "./common/responses";
import { IndexFacesError } from "./errors/indexFaces";
import { INVOCATION_EVENT, INVOCATION_REQUEST_RESPONSE } from "./lib/constants";
import dynamodb from "./lib/dynamodb";
import lambda from "./lib/lambda";
import logger from "./lib/logger";
import rekognition from "./lib/rekognition";
import {
  ICreateBody,
  ILoggerBaseParams,
  ILoggerCreateParams,
  ITraceMeta,
} from "./types";

const fotopiaGroup: string = process.env.FOTOPIA_GROUP || "";
export const THUMB_SUFFIX = "-thumbnail";

export function replicateAuthKey(imgKey: string, userIdentityId: string): string {
  return `protected/${userIdentityId}/${imgKey}`;
}

export function safeLength(arr?: any[]): number {
  return Array.isArray(arr) ? arr.length : 0;
}

export function getTagsFromRekognitionLabels(labels: DetectLabelsResponse): string[] {
  return labels && labels.Labels && Array.isArray(labels.Labels) ?
    labels.Labels.filter((label) => label.Name).map((label) => label.Name!) :
    [];
}
export function getLogFields(request, dbItem?, faces?, labels?: DetectLabelsResponse): ILoggerCreateParams {
  return {
    createIdentifiedFacesCount: safeLength(faces),
    createIdentifiedLabelsCount: labels ? safeLength(getTagsFromRekognitionLabels(labels)) : 0,
    createPayloadTagCount: safeLength(request.tags),
    imageBirthtime: dbItem && dbItem.birthtime || request.birthtime,
    imageCreatedAt: dbItem && dbItem.createdAt,
    imageFacesCount: dbItem && safeLength(dbItem.faces) || 0,
    imageFacesRaw: dbItem && JSON.stringify(dbItem.faces),
    imageFamilyGroup: fotopiaGroup,
    imageHeight: request.meta && request.meta.height,
    imageId: dbItem && dbItem.id,
    imageKey: request.img_key,
    imageMetaRaw: request.meta && JSON.stringify(request.meta),
    imageTagCount: dbItem && safeLength(dbItem.tags) || 0,
    imageUpdatedAt: dbItem && dbItem.updatedAt,
    imageUserIdentityId: request.userIdentityId,
    imageUsername: request.username,
    imageWidth: request.meta && request.meta.width,
  };
}

export function createThumbKey(key: string): string {
  const keySplit = key.split(".");
  const ext = keySplit[keySplit.length - 1];
  return `${key.substr(0, key.lastIndexOf(ext) - 1)}${THUMB_SUFFIX}.${ext}`;
}

export function getInvokeThumbnailsParams(data: ICreateBody, loggerBaseParams: ILoggerBaseParams): InvocationRequest {
  const authKey = replicateAuthKey(data.img_key, data.userIdentityId);
  return {
    FunctionName: `${process.env.LAMBDA_PREFIX}thumbs`,
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

export function getDynamoDbParams(
  data: ICreateBody,
  id: string,
  group: string,
  faces: FaceRecord[],
  labels: DetectLabelsResponse,
): DocClient.PutItemInput {
  const timestamp: number = new Date().getTime();
  const rekLabels: string[] = getTagsFromRekognitionLabels(labels);
  const tags: string[] = Array.isArray(data.tags) ?
    [...data.tags, ...rekLabels] :
    [...rekLabels];
  return {
    Item: {
      birthtime: new Date(data.birthtime).getTime(),
      createdAt: timestamp,
      faces, // prob null from rekognition error, hack for now
      group,
      id,
      img_key: data.img_key, // s3 object key
      img_thumb_key: createThumbKey(data.img_key),
      meta: data.meta, // whatever metadata we've got for this item
      people: new Array<string>(),
      tags,
      updatedAt: timestamp,
      userIdentityId: data.userIdentityId,
      username: data.username,
    },
    TableName: getTableName(),
  };
}

export function parseRekognitionError(
  e: AWSError,
  data: ICreateBody,
  id: string,
  indexFacesParams: IndexFacesRequest,
): Promise<FaceRecord[]> {
  if (e.code && e.code === "ResourceNotFoundException") {
    const params = {
      CollectionId: fotopiaGroup,
    };
    return rekognition.createCollection(params)
      .promise()
      // eslint-disable-next-line
      .then(() => getRekognitionFaceData(data, id));
  } else {
    throw new IndexFacesError(e, indexFacesParams);
  }
}

export function getRekognitionFaceData(
  data: ICreateBody,
  id: string,
): Promise<FaceRecord[]> {
  const params: IndexFacesRequest = {
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
  return rekognition.indexFaces(params)
    .promise()
    .then((response: IndexFacesResponse) => response.FaceRecords || Array<FaceRecord>())
    .catch((e) => {
      return parseRekognitionError(e, data, id, params);
    });
}

export function getRekognitionLabelData(data): Promise<DetectLabelsResponse> {
  const params: DetectLabelsRequest = {
    Image: {
      S3Object: {
        Bucket: process.env.S3_BUCKET,
        Name: replicateAuthKey(data.img_key, data.userIdentityId),
      },
    },
    MaxLabels: 30,
    MinConfidence: 80,
  };
  return rekognition.detectLabels(params)
    .promise();
}

export function getInvokeFacesParams(
  ddbParams: DocClient.PutItemInput,
  loggerBaseParams: ILoggerBaseParams,
): InvocationRequest {
  return {
    FunctionName: `${process.env.LAMBDA_PREFIX}faces`,
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

export async function createItem(event: APIGatewayProxyEvent, context: Context, callback: Callback) {
  const startTime = Date.now();
  const data: ICreateBody = event.body ? JSON.parse(event.body) : undefined;
  const traceMeta: ITraceMeta | undefined = data ? data.traceMeta : undefined;
  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "createItem",
    parentId: traceMeta && traceMeta!.parentId || "",
    startTime,
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };
  try {

    const id = uuidv5(data.img_key, uuidv5.DNS);
    const invokeParams = getInvokeThumbnailsParams(data, loggerBaseParams);
    const thumbPromise = lambda.invoke(invokeParams).promise();
    const facesPromise = getRekognitionFaceData(data, id);
    const labelsPromise = getRekognitionLabelData(data);

    await thumbPromise; // do we need to wait for this? could probably change this to an event invoke
    const faces: FaceRecord[] = await facesPromise;
    const labels: DetectLabelsResponse = await labelsPromise;

    const ddbParams: DocClient.PutItemInput = getDynamoDbParams(data, id, fotopiaGroup, faces, labels);
    await dynamodb.put(ddbParams).promise();

    const facesParams = getInvokeFacesParams(ddbParams, loggerBaseParams);
    lambda.invoke(facesParams).promise();

    logger(context, loggerBaseParams, getLogFields(data, ddbParams.Item, faces, labels));
    return callback(null, success(ddbParams.Item));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(data) });
    return callback(null, failure(err));
  }
}
