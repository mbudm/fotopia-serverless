import { Rekognition } from "aws-sdk";
import * as uuid from "uuid";

import { getExistingPeople } from "./common/getExistingPeople";
import { putPeople } from "./common/putPeople";
import { failure, success } from "./common/responses";
import { safeLength } from "./create";
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
  IQueryResponse,
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
import { JSONParseError } from "./errors/jsonParse";

export function getBodyFromDbGetResponse(dbGetResponse) {
  try {
    const payload = dbGetResponse && JSON.parse(dbGetResponse.Payload);
    return payload ? JSON.parse(payload.body) : {};
  } catch (e) {
    throw new JSONParseError(e, "getBodyFromDbGetResponse");
  }
}
export function getS3Params(dbGetResponse) {
  const body = getBodyFromDbGetResponse(dbGetResponse);
  return {
    Bucket: process.env.S3_BUCKET,
    Key: body.img_key,
  };
}

export function getInvokeGetParams(request): InvocationRequest {
  const pathParameters: IPathParameters = request as IPathParameters;
  return {
    FunctionName: process.env.IS_OFFLINE ? "get" : `${process.env.LAMBDA_PREFIX}get`,
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    LogType: "Tail",
    Payload: JSON.stringify({
      pathParameters,
    }),
  };
}

export function invokeGetImageRecord(params): Promise<IImage> {
  return lambda.invoke(params).promise()
    .then((invocationResponse: InvocationResponse) =>
      JSON.parse(invocationResponse.Payload as string),
    )
    .catch((e) => {
      throw new JSONParseError(e, "invokeGetImageRecord");
    });

}

export function deleteObject(s3, s3Params) {
  return s3.deleteObject(s3Params).promise();
}

export function deleteImageRecord(ddbParams) {
  return dynamodb.delete(ddbParams).promise();
}

export function deleteFacesInImage(image: IImage): Promise<DeleteFacesResponse> | DeleteFacesResponse {
  if (image.faces && image.faces.length > 0) {
    const rekognitionClient = new Rekognition();
    const params: DeleteFacesRequest = {
      CollectionId: process.env.FOTOPIA_GROUP!,
      FaceIds: image.faces as string[],
    };
    return rekognitionClient.deleteFaces(params).promise();
  } else {
    return {
      DeletedFaces: [],
    };
  }
}

export function getInvokeQueryParams(image: IImage) {
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
      body: {
        ...request,
      },
    }),
  };
}

export function getPeopleWithImages(image: IImage, queriedImages: IImage[]): IPersonWithImages[] {
  return image.people!.map((personId): IPersonWithImages => ({
    id: personId,
    imageIds: queriedImages.filter((qImg) => qImg.people!.includes(personId)).map((qImg) => qImg.id),
  }));
}

export function queryImagesByPeople(image: IImage): Promise<IPersonWithImages[]> {
  const params = getInvokeQueryParams(image);
  return lambda.invoke(params).promise()
  .then((invocationResponse: InvocationResponse) => {
    const queriedImages: IImage[] = JSON.parse(invocationResponse.Payload as string);
    return getPeopleWithImages(image, queriedImages);
  })
  .catch((e) => {
    throw new JSONParseError(e, "queryImagesByPeople");
  });
}

export function getDeletePeople(peopleImages: IPersonWithImages[]): string[] {
  return peopleImages.reduce((accumPeople: string[], person: IPersonWithImages) => {
    return person.imageIds.length === 0 ?
      accumPeople.concat([person.id]) :
      accumPeople;
  }, []);
}

export function deletePeopleUniqueToImage(
  s3,
  bucket,
  key,
  existingPeople: IPerson[],
  imagesForPeople: IPersonWithImages[],
) {
  const updatedPeople: IPerson[] = getUpdatedPeople(existingPeople, imagesForPeople);
  return putPeople(s3, updatedPeople, bucket, key);
}

export function getUpdatedPeople(existingPeople: IPerson[], imagesForPeople: IPersonWithImages[]) {
  const deletePeople = getDeletePeople(imagesForPeople);
  return existingPeople.filter((p) => !deletePeople.find((dp) => dp === p.id));
}

export function getLogFields(pathParams, dbGetResponse) {
  const body = getBodyFromDbGetResponse(dbGetResponse);
  return {
    imageBirthtime: body.birthtime,
    imageCreatedAt: body.createdAt,
    imageFacesCount: safeLength(body.faces),
    imageFamilyGroup: body.group,
    imageHeight: body.meta && body.meta.height,
    imageId: body.id,
    imageKey: body.img_key,
    imagePeopleCount: safeLength(body.people),
    imageTagCount: safeLength(body.tags),
    imageUpdatedAt: body.updatedAt,
    imageUserIdentityId: body.userIdentityId,
    imageUsername: body.username,
    imageWidth: body.meta && body.meta.width,
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
    const imagesForPeople: IPersonWithImages[] = await queryImagesByPeople(imageRecord);
    await Promise.all([
      deletePeopleUniqueToImage(s3, bucket, PEOPLE_KEY, existingPeople, imagesForPeople),
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
