import { Rekognition } from "aws-sdk";
import {
  CreateCollectionRequest,
  CreateCollectionResponse,
  DeleteCollectionRequest,
  DeleteCollectionResponse,
} from "aws-sdk/clients/rekognition";
import * as uuid from "uuid";
import { failure, success } from "./common/responses";
import logger from "./lib/logger";
import { ILoggerBaseParams } from "./types";

const fotopiaGroup = process.env.FOTOPIA_GROUP || "";

export function getCreateLogParams(
  name: string,
  params: CreateCollectionResponse,
) {
  return {
    rekognitionCollectionArn: params.CollectionArn,
    rekognitionCollectionName: name,
    rekognitionFaceModelVersion: params.FaceModelVersion,
    rekognitionStatusCode: params.StatusCode,
  };
}

export async function createCollection(event, context, callback) {
  const startTime = Date.now();
  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "createCollection",
    parentId: "",
    startTime,
    traceId: uuid.v1(),
  };
  try {
    const rekognitionClient = new Rekognition();
    const params: CreateCollectionRequest = {
      CollectionId: fotopiaGroup,
    };
    const rekResponse: CreateCollectionResponse = await rekognitionClient
      .createCollection(params)
      .promise();
    logger(
      context,
      loggerBaseParams,
      getCreateLogParams(params.CollectionId, rekResponse),
    );
    return callback(null, success(rekResponse));
  } catch (err) {
    logger(context, loggerBaseParams, { err });
    return callback(null, failure(err));
  }
}

export function getDeleteLogParams(
  name: string,
  params: DeleteCollectionResponse,
) {
  return {
    rekognitionCollectionName: name,
    rekognitionStatusCode: params.StatusCode,
  };
}

export async function deleteCollection(event, context, callback) {
  const startTime = Date.now();
  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "deleteCollection",
    parentId: "",
    startTime,
    traceId: uuid.v1(),
  };
  try {
    const rekognitionClient = new Rekognition();
    const params: DeleteCollectionRequest = {
      CollectionId: fotopiaGroup,
    };
    const rekResponse: DeleteCollectionResponse = await rekognitionClient
      .deleteCollection(params)
      .promise();
    logger(
      context,
      loggerBaseParams,
      getDeleteLogParams(params.CollectionId, rekResponse),
    );
    return callback(null, success(rekResponse));
  } catch (err) {
    logger(context, loggerBaseParams, { err });
    return callback(null, failure(err));
  }
}
