import { APIGatewayProxyEvent, Callback, Context } from "aws-lambda";
import { Rekognition, S3 } from "aws-sdk";
import {
  InvocationRequest,
  InvocationResponse,
} from "aws-sdk/clients/lambda";
import {
  DeleteFacesRequest,
  DeleteFacesResponse,
} from "aws-sdk/clients/rekognition";
import { DeleteObjectOutput, DeleteObjectRequest, GetObjectRequest } from "aws-sdk/clients/s3";
import {
  DocumentClient as DocClient,
} from "aws-sdk/lib/dynamodb/document_client.d";
import * as uuid from "uuid";
import getS3Bucket from "./common/getS3Bucket";
import { getTraceMeta } from "./common/getTraceMeta";
import invokeGetPeople from "./common/invokeGetPeople";
import invokePutPeople from "./common/invokePutPeople";
import { failure, success } from "./common/responses";
import { replicateAuthKey, safeLength } from "./create";
import { DeleteObjectError } from "./errors/deleteObject";
import { DeleteRecordError } from "./errors/deleteRecord";
import { JSONParseError } from "./errors/jsonParse";
import { getDynamoDbParams } from "./get";
import { INVOCATION_REQUEST_RESPONSE } from "./lib/constants";
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

export function getS3Params(imageRecord: IImage): GetObjectRequest  {
  if (imageRecord && imageRecord.img_key) {
    return {
      Bucket: getS3Bucket(),
      Key: replicateAuthKey(imageRecord.img_key, imageRecord.userIdentityId),
    };
  } else {
    throw new Error(`No img_key in imageRecord: ${JSON.stringify(imageRecord)}`);
  }
}

export function getInvokeGetParams(request: IPathParameters | null, traceMeta): InvocationRequest {
  if (request === null ) {
    throw new Error("No path parameters provided");
  } else {
    return {
      FunctionName: `${process.env.LAMBDA_PREFIX}get`,
      InvocationType: INVOCATION_REQUEST_RESPONSE,
      LogType: "Tail",
      Payload: JSON.stringify({
        body: JSON.stringify({
          traceMeta,
        }),
        pathParameters: request,
      }),
    };
  }
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

export function deleteObject(s3: S3, s3Params: DeleteObjectRequest): Promise<DeleteObjectOutput> {
  return s3.deleteObject(s3Params).promise()
    .catch((e) => {
      throw new DeleteObjectError(e, s3Params.Key, s3Params.Bucket);
    });
}

export function deleteImageRecord(ddbParams: DocClient.DeleteItemInput ): Promise<DocClient.DeleteItemOutput> {
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

export function deleteFacesInImage(image: IImage): Promise<DeleteFacesResponse> {
  const faces = getFaceIds(image);
  if (faces.length > 0) {
    const rekognitionClient = new Rekognition();
    const params: DeleteFacesRequest = {
      CollectionId: process.env.FOTOPIA_GROUP!,
      FaceIds: faces,
    };
    return rekognitionClient.deleteFaces(params).promise();
  } else {
    return Promise.resolve({
      DeletedFaces: [],
    });
  }
}

export function getInvokeQueryParams(image: IImage, traceMeta: ITraceMeta, context: Context): InvocationRequest {
  const request: IQueryBody = {
    breakDateRestriction: true,
    clientId: context.functionName,
    criteria: {
      people: image.people!,
      tags: [],
    },
    from: 0,
    to: Date.now(),
  };
  return {
    FunctionName: `${process.env.LAMBDA_PREFIX}query`,
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    LogType: "Tail",
    Payload: JSON.stringify({
      body: JSON.stringify({
        ...request,
        traceMeta,
      }),
    }),
  };
}

export function getPeopleWithImages(image: IImage, queriedImages: IImage[]): IPersonWithImages[] {
  return image.people!.map((personId): IPersonWithImages => ({
    id: personId,
    imageIds: queriedImages
      .filter((qImg) => qImg.people!.includes(personId) && qImg.id !== image.id)
      .map((qImg) => qImg.id),
  }));
}

export function queryImagesByPeople(
  image: IImage, traceMeta: ITraceMeta, context: Context,
): Promise<IPersonWithImages[]> {
  const params = getInvokeQueryParams(image, traceMeta, context);
  return lambda.invoke(params).promise()
  .then((invocationResponse: InvocationResponse) => parseQueryResponse(invocationResponse, image));
}

export function parseQueryResponse(invocationResponse: InvocationResponse, image: IImage): IPersonWithImages[] {
  try {
    const payload = JSON.parse(invocationResponse.Payload as string);
    const queriedImages: IImage[] = JSON.parse(payload.body);
    return image && image.people && Array.isArray(queriedImages) ?
      getPeopleWithImages(image, queriedImages) :
      getPeopleWithImages(image, []);
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

export function getUpdatedPeople(existingPeople: IPerson[], imagesForPeople: IPersonWithImages[]): IPerson[] {
  const deletePeople = getDeletePeople(imagesForPeople);
  return existingPeople.filter((p) => !deletePeople.find((dp) => dp === p.id));
}

export function getLogFields(
  pathParams: IPathParameters | null,
  imageRecord?: IImage,
  existingPeople?: IPerson[],
  updatedPeople?: IPerson[],
  imagesForPeople?: IPersonWithImages[],
  ) {
  return {
    imageBirthtime: imageRecord && imageRecord.birthtime,
    imageCreatedAt: imageRecord && imageRecord.createdAt,
    imageFacesCount: imageRecord && imageRecord.faces && safeLength(imageRecord.faces),
    imageFamilyGroup: imageRecord && imageRecord.group,
    imageHeight: imageRecord && imageRecord.meta.height,
    imageId: imageRecord && imageRecord.id,
    imageKey: imageRecord && imageRecord.img_key,
    imagePeopleCount: imageRecord && imageRecord.people && safeLength(imageRecord.people),
    imageRecordRaw: JSON.stringify(imageRecord),
    imageTagCount: imageRecord && imageRecord.tags && safeLength(imageRecord.tags),
    imageUpdatedAt: imageRecord && imageRecord.updatedAt,
    imageUserIdentityId: imageRecord && imageRecord.userIdentityId,
    imageUsername: imageRecord && imageRecord.username,
    imageWidth: imageRecord && imageRecord.meta.width,
    imagesForPeopleRaw: imagesForPeople && JSON.stringify(imagesForPeople),
    paramId: pathParams && pathParams.id,
    paramUsername: pathParams && pathParams.username,
    peopleCount: safeLength(existingPeople),
    updatedPeopleCount: safeLength(updatedPeople),
  };
}

export async function deleteItem(event: APIGatewayProxyEvent, context: Context, callback: Callback) {
  const startTime: number = Date.now();
  const s3: S3 = createS3Client();
  const traceMeta: ITraceMeta | null = event.body ? JSON.parse(event.body) : null;
  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "deleteItem",
    parentId: traceMeta && traceMeta!.parentId || "",
    startTime,
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };
  const request: IPathParameters | null = event.pathParameters && event.pathParameters! as unknown as IPathParameters;
  try {
    const params: InvocationRequest = getInvokeGetParams(request, getTraceMeta(loggerBaseParams));
    const imageRecord: IImage = await invokeGetImageRecord(params);
    const existingPeople: IPerson[] = await invokeGetPeople(getTraceMeta(loggerBaseParams));
    const s3Params: GetObjectRequest = getS3Params(imageRecord);
    const deleteS3ObjectPromise: Promise<DeleteObjectOutput> = deleteObject(s3, s3Params);
    const ddbParams: DocClient.GetItemInput = getDynamoDbParams(request);
    const deleteImageRecordPromise: Promise<DocClient.DeleteItemOutput> = deleteImageRecord(ddbParams);
    const deleteFacesInImagePromise: Promise<DeleteFacesResponse> = deleteFacesInImage(imageRecord);
    const imagesForPeople: IPersonWithImages[] = await queryImagesByPeople(
      imageRecord, getTraceMeta(loggerBaseParams), context,
    );
    const updatedPeople: IPerson[] = getUpdatedPeople(existingPeople, imagesForPeople);
    invokePutPeople(
      updatedPeople,
      getTraceMeta(loggerBaseParams),
    );
    await Promise.all([
      deleteFacesInImagePromise,
      deleteImageRecordPromise,
      deleteS3ObjectPromise,
    ]);
    logger(
      context,
      loggerBaseParams,
      getLogFields(request, imageRecord, existingPeople, updatedPeople, imagesForPeople),
    );
    return callback(null, success(ddbParams.Key));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(request)});
    return callback(null, failure(err));
  }
}
