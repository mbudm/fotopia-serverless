import { Rekognition } from "aws-sdk";
import * as uuid from "uuid";

import { getExistingPeople } from "./common/getExistingPeople";
import { putPeople } from "./common/putPeople";
import { failure, success } from "./common/responses";
import { getTraceMeta, replicateAuthKey, safeLength } from "./create";
import { getDynamoDbParams } from "./get";
import { INVOCATION_REQUEST_RESPONSE, PEOPLE_KEY } from "./lib/constants";
import dynamodb from "./lib/dynamodb";
import lambda from "./lib/lambda";
import logger from "./lib/logger";
import createS3Client from "./lib/s3";
import {
  IImage,
  ILoggerBaseParams,
  IPathParameters,
  IPerson,
  IPersonWithImages,
  IQueryBody,
  ITraceMeta,
} from "./types";

import {
  DeleteFacesRequest,
  DeleteFacesResponse,
} from "aws-sdk/clients/rekognition";

import {
  InvocationRequest,
  InvocationResponse,
} from "aws-sdk/clients/lambda";
import { DeleteObjectError } from "./errors/deleteObject";
import { DeleteRecordError } from "./errors/deleteRecord";
import { JSONParseError } from "./errors/jsonParse";

export function getS3Params(imageRecord: IImage) {
  if (imageRecord && imageRecord.img_key) {
    return {
      Bucket: process.env.S3_BUCKET,
      Key: replicateAuthKey(imageRecord.img_key, imageRecord.userIdentityId),
    };
  } else {
    throw new Error(`No img_key in imageRecord: ${JSON.stringify(imageRecord)}`);
  }
}

export function getInvokeGetParams(request: IPathParameters): InvocationRequest {
  return {
    FunctionName: process.env.IS_OFFLINE ? "get" : `${process.env.LAMBDA_PREFIX}get`,
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    LogType: "Tail",
    Payload: JSON.stringify({
      pathParameters: request,
    }),
  };
}

export function invokeGetImageRecord(params): Promise<IImage> {
  return lambda.invoke(params).promise()
    .then((invocationResponse: InvocationResponse) => {
      try {
        const payload = JSON.parse(invocationResponse.Payload as string);
        const imageRecord: IImage = JSON.parse(payload.body);
        return imageRecord;
      } catch (e) {
        // tslint:disable-next-line:max-line-length
        throw new JSONParseError(e, `invokeGetImageRecord, invocationResponse is : ${JSON.stringify(invocationResponse)}`);
      }
    })
    .catch((e) => {
      throw new JSONParseError(e, "invokeGetImageRecord");
    });

}

export function deleteObject(s3, s3Params) {
  return s3.deleteObject(s3Params).promise()
    .catch((e) => {
      throw new DeleteObjectError(e, s3Params.Key, s3Params.Bucket);
    });
}

export function deleteImageRecord(ddbParams) {
  return dynamodb.delete(ddbParams).promise()
    .catch((e) => {
      throw new DeleteRecordError(e, ddbParams);
    });
}
export function getFaceIds(image: IImage): string[] {
  return image && image.faces ?
    image.faces
      .filter((f) => f.Face!.FaceId !== undefined)
      .map((f) => f.Face!.FaceId!) :
    [];
}

export function deleteFacesInImage(image: IImage): Promise<DeleteFacesResponse> | DeleteFacesResponse {
  const faces = getFaceIds(image);
  if (faces.length > 0) {
    const rekognitionClient = new Rekognition();
    const params: DeleteFacesRequest = {
      CollectionId: process.env.FOTOPIA_GROUP!,
      FaceIds: faces,
    };
    return rekognitionClient.deleteFaces(params).promise();
  } else {
    return {
      DeletedFaces: [],
    };
  }
}

export function getInvokeQueryParams(image: IImage, loggerBaseParams) {
  const request: IQueryBody = {
    criteria: {
      people: image.people!,
      tags: [],
    },
    from: 0,
    to: Date.now(),
  };
  return {
    FunctionName: process.env.IS_OFFLINE ? "query" : `${process.env.LAMBDA_PREFIX}query`,
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    LogType: "Tail",
    Payload: JSON.stringify({
      body: JSON.stringify({
        ...request,
        traceMeta: getTraceMeta(loggerBaseParams),
      }),
    }),
  };
}

export function getPeopleWithImages(image: IImage, queriedImages: IImage[]): IPersonWithImages[] {
  return image.people!.map((personId): IPersonWithImages => ({
    id: personId,
    imageIds: queriedImages.filter((qImg) => qImg.people!.includes(personId)).map((qImg) => qImg.id),
  }));
}

export function queryImagesByPeople(image: IImage, loggerBaseParams): Promise<IPersonWithImages[]> {
  const params = getInvokeQueryParams(image, loggerBaseParams);
  return lambda.invoke(params).promise()
  .then((invocationResponse: InvocationResponse) => parseQueryResponse(invocationResponse, image));
}

export function parseQueryResponse(invocationResponse: InvocationResponse, image: IImage) {
  try {
    const payload = JSON.parse(invocationResponse.Payload as string);
    const queriedImages: IImage[] = JSON.parse(payload.body);
    return image && image.people && Array.isArray(queriedImages) ?
      getPeopleWithImages(image, queriedImages) :
      [];
  } catch (e) {
    throw new JSONParseError(e, `parseQueryResponse: ${JSON.stringify(invocationResponse)}`);
  }
}

export function getDeletePeople(peopleImages: IPersonWithImages[]): string[] {
  return peopleImages.reduce((accumPeople: string[], person: IPersonWithImages) => {
    return person.imageIds.length === 0 ?
      accumPeople.concat([person.id]) :
      accumPeople;
  }, []);
}

export function getInvokeUpdatePeopleParams(body: IPerson[], logBaseParams: ILoggerBaseParams): InvocationRequest {
  return {
    FunctionName: process.env.IS_OFFLINE ? "peopleUpdate" : `${process.env.LAMBDA_PREFIX}peopleUpdate`,
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    LogType: "Tail",
    Payload: JSON.stringify({
      body: JSON.stringify(body),
      traceMeta: {
        parentId: logBaseParams.parentId,
        traceId: logBaseParams.traceId,
      },
    }),
  };
}

export function deletePeopleUniqueToImage(
  existingPeople: IPerson[],
  imagesForPeople: IPersonWithImages[],
  logBaseParams: ILoggerBaseParams,
) {
  const updatedPeople: IPerson[] = getUpdatedPeople(existingPeople, imagesForPeople);
  const updateParams: InvocationRequest = getInvokeUpdatePeopleParams(updatedPeople, logBaseParams);
  return lambda.invoke(updateParams).promise();
}

export function getUpdatedPeople(existingPeople: IPerson[], imagesForPeople: IPersonWithImages[]) {
  const deletePeople = getDeletePeople(imagesForPeople);
  return existingPeople.filter((p) => !deletePeople.find((dp) => dp === p.id));
}

export function getLogFields(pathParams, imageRecord) {
  return {
    imageBirthtime: imageRecord && imageRecord.birthtime,
    imageCreatedAt: imageRecord && imageRecord.createdAt,
    imageFacesCount: imageRecord && safeLength(imageRecord.faces),
    imageFamilyGroup: imageRecord && imageRecord.group,
    imageHeight: imageRecord && imageRecord.meta.height,
    imageId: imageRecord && imageRecord.id,
    imageKey: imageRecord && imageRecord.img_key,
    imagePeopleCount: imageRecord && safeLength(imageRecord.people),
    imageRecordRaw: JSON.stringify(imageRecord),
    imageTagCount: imageRecord && safeLength(imageRecord.tags),
    imageUpdatedAt: imageRecord && imageRecord.updatedAt,
    imageUserIdentityId: imageRecord && imageRecord.userIdentityId,
    imageUsername: imageRecord && imageRecord.username,
    imageWidth: imageRecord && imageRecord.meta.width,
    paramId: pathParams.id,
    paramUsername: pathParams.username,
  };
}

export async function deleteItem(event, context, callback) {
  const startTime = Date.now();
  const s3 = createS3Client();
  const bucket = process.env.S3_BUCKET;
  const traceMeta: ITraceMeta | null = event.body ? JSON.parse(event.body) : null;
  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "deleteItem",
    parentId: traceMeta && traceMeta!.parentId || "",
    startTime,
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };
  try {
    const request: IPathParameters = event.pathParameters;
    const params = getInvokeGetParams(request);
    const imageRecord: IImage = await invokeGetImageRecord(params);
    const existingPeople: IPerson[] = await getExistingPeople(s3, bucket, PEOPLE_KEY);
    const s3Params = getS3Params(imageRecord);
    const deleteS3ObjectPromise = deleteObject(s3, s3Params);
    const ddbParams = getDynamoDbParams(request);
    const deleteImageRecordPromise = deleteImageRecord(ddbParams);
    const deleteFacesInImagePromise = deleteFacesInImage(imageRecord);
    const imagesForPeople: IPersonWithImages[] = await queryImagesByPeople(imageRecord, loggerBaseParams);
    await Promise.all([
      deletePeopleUniqueToImage(existingPeople, imagesForPeople, loggerBaseParams),
      deleteFacesInImagePromise,
      deleteImageRecordPromise,
      deleteS3ObjectPromise,
    ]);
    logger(context, loggerBaseParams, getLogFields(request, imageRecord));
    return callback(null, success(ddbParams.Key));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(event.pathParameters, null) });
    return callback(null, failure(err));
  }
}
