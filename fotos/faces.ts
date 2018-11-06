import { APIGatewayProxyEvent, Callback, Context, DynamoDBRecord, StreamRecord} from "aws-lambda";
import { InvocationRequest } from "aws-sdk/clients/lambda";
import { FaceMatch, FaceMatchList } from "aws-sdk/clients/rekognition";
import { PutObjectOutput, PutObjectRequest } from "aws-sdk/clients/s3";
import { AttributeValue as ddbAttVals } from "dynamodb-data-types";
import * as uuid from "uuid";

import {
  INVOCATION_EVENT,
  INVOCATION_REQUEST_RESPONSE,
  PEOPLE_KEY,
} from "./lib/constants";
import lambda from "./lib/lambda";
import logger from "./lib/logger";
import rekognition from "./lib/rekognition";
import createS3Client from "./lib/s3";

import {
  IFace,
  IFaceMatcherCallback,
  IFaceMatcherCallbackResponse,
  IFaceWithPeople,
  IImage,
  ILoggerBaseParams,
  ILoggerFacesParams,
  IPathParameters,
  IPerson,
  IPersonMatch,
  IUpdateBody,
} from "./types";

import { failure, success } from "./lib/responses";

import { SearchFacesRequest } from "aws-sdk/clients/rekognition";
import { safeLength } from "./create";

const MATCH_THRESHOLD = 80;
const PERSON_THUMB_SUFFIX = "-face-";
const fotopiaGroup = process.env.FOTOPIA_GROUP || "";

export function getS3Params(Bucket: string | undefined, Key: string | undefined) {
  return {
    Bucket,
    Key,
  };
}

export function getS3PutParams(indexData, Bucket, Key): PutObjectRequest {
  return {
    Body: JSON.stringify(indexData),
    Bucket,
    ContentType: "application/json",
    Key,
  };
}

export function getExistingPeople(s3, Bucket, Key): Promise<IPerson[]> {
  const s3Params = getS3Params(Bucket, Key);
  return s3.getObject(s3Params).promise()
    .then((s3Object) => {
      return JSON.parse(s3Object.Body.toString());
    })
    .catch((e) => {
      if (e.code === "NoSuchKey" || e.code === "AccessDenied") {
        // tslint:disable-next-line:no-console
        console.log("No object found / AccessDenied - assuming empty people list");
        return [];
      }
      // tslint:disable-next-line:no-console
      console.log("Another error with get people object", e);
      return { error: e, s3Params };
    });
}

export function putPeople(s3, people, Bucket, Key): Promise<PutObjectOutput> {
  const s3PutParams = getS3PutParams(people, Bucket, Key);
  return s3.putObject(s3PutParams).promise()
    .catch((e) => {
      const logitall = { e, people };
      throw new Error(JSON.stringify(logitall));
    });
}

export function getFaceMatch(face: string): Promise<IFaceMatcherCallbackResponse> {
  const params: SearchFacesRequest = {
    CollectionId: fotopiaGroup,
    FaceId: face,
    FaceMatchThreshold: MATCH_THRESHOLD,
  };
  return rekognition ?
    rekognition.searchFaces(params)
      .promise()
      .then((response) => ({
          FaceMatches: new Array<FaceMatch>(),
          SearchedFaceId: face,
          ...response,
        }),
      )
      .catch((e) => {
        throw new Error(`Face Match Error: ${JSON.stringify(e)}`);
      }) :
    new Promise((res) => res({
      FaceMatches: new Array<FaceMatch>(),
      SearchedFaceId: face,
    }));
}

export function getSimilarityAggregate(person: IPerson, faceMatches: FaceMatchList): number {
  const personFacesWithSimilarity = person.faces.map((personFace) => {
    const faceMatch = faceMatches
      .find((matchedFace) => matchedFace.Face!.FaceId === personFace.FaceId);
    return faceMatch && faceMatch.Similarity ? faceMatch.Similarity : 0;
  });
  return personFacesWithSimilarity
    .reduce((accum, sim) => accum + sim, 0) / person.faces.length;
}

export function getPeopleForFace(existingPeople: IPerson[], faceMatches: FaceMatchList): IPersonMatch[] {
  return existingPeople.map((person) => ({
    Match: getSimilarityAggregate(person, faceMatches),
    Person: person.id,
  }));
}

export function getNewImage(body: string): IImage {
  return JSON.parse(body);
}

export function getPeopleForFaces(
  newImage: IImage,
  existingPeople: IPerson[],
  faceMatcher: IFaceMatcherCallback): Promise<IFaceWithPeople[]> {
  return Promise.all(newImage.faces!
    .map((face) => faceMatcher(face.Face!.FaceId || "")
      .then(({ FaceMatches, SearchedFaceId }) => {
        const peopleMatches = getPeopleForFace(existingPeople, FaceMatches);
        return {
          BoundingBox: face.Face!.BoundingBox || {
            Height: 50,
            Left: 0,
            Top: 0,
            Width: 50,
          },
          ExternalImageId: face.Face!.ExternalImageId || "",
          FaceId: SearchedFaceId,
          FaceMatches, // I dont think this is needed, just bloating the record
          ImageDimensions: {
            height: newImage.meta && newImage.meta.height,
            width: newImage.meta && newImage.meta.width,
          },
          People: peopleMatches,
          img_key: newImage.img_key,
          userIdentityId: newImage.userIdentityId,
        };
      })));
}

export function getFacesThatMatchThisPerson(
  person: IPerson,
  facesWithPeopleMatches: IFaceWithPeople[],
): IFace[] {
  return facesWithPeopleMatches.filter((face) => face.People
    .find((p) => p.Person === person.id && p.Match >= MATCH_THRESHOLD))
    .map((f) => ({
      ExternalImageId: f.ExternalImageId,
      FaceId: f.FaceId,
    }));
}

export function createPersonThumbKey(newFace: IFaceWithPeople): string {
  const keySplit = newFace.img_key.split(".");
  const ext = keySplit[keySplit.length - 1];
  return `${newFace.img_key.substr(0, newFace.img_key.lastIndexOf(ext) - 1)}
    ${PERSON_THUMB_SUFFIX}-${newFace.FaceId}.${ext}`;
}

export function getNewPeople(facesWithPeople: IFaceWithPeople[]): IPerson[] {
  const newFaces = facesWithPeople
    .filter((face) => !face.People.find((person) => person.Match >= MATCH_THRESHOLD));
  return newFaces.map((newFace) => ({
    boundingBox: newFace.BoundingBox,
    faces: [{
      ExternalImageId: newFace.ExternalImageId,
      FaceId: newFace.FaceId,
    }],
    id: String(uuid.v1()),
    imageDimensions: newFace.ImageDimensions,
    img_key: newFace.img_key,
    name: "",
    thumbnail: createPersonThumbKey(newFace),
    userIdentityId: newFace.userIdentityId || "",
  }));
}

export function getInvokePersonThumbParams(
    personInThisImage: IPerson,
    logBaseParams: ILoggerBaseParams,
  ): InvocationRequest {
  return {
    FunctionName: process.env.IS_OFFLINE ? "personThumb" : `${process.env.LAMBDA_PREFIX}personThumb`,
    InvocationType: INVOCATION_EVENT,
    LogType: "None",
    Payload: JSON.stringify({
      body: JSON.stringify({
        person: personInThisImage,
        traceMeta: {
          parentId: logBaseParams.parentId,
          traceId: logBaseParams.traceId,
        },
      }),
    }),
  };
}

export function invokePeopleThumbEvents(newPeopleInThisImage: IPerson[], logBaseParams: ILoggerBaseParams) {
  newPeopleInThisImage.forEach((person) => {
    const newPersonThumbParams: InvocationRequest = getInvokePersonThumbParams(person, logBaseParams);
    lambda.invoke(newPersonThumbParams).promise();
  });
}

export function getUpdatedPeople(
  existingPeople: IPerson[],
  facesWithPeople: IFaceWithPeople[],
  newPeopleInThisImage: IPerson[],
): IPerson[] {
  return existingPeople.map((person) => ({
    ...person,
    faces: person.faces.concat(getFacesThatMatchThisPerson(person, facesWithPeople)),
  })).concat(newPeopleInThisImage);
}

export function getUpdateBody(peopleForTheseFaces: IFaceWithPeople[], updatedPeople: IPerson[]): IUpdateBody {
  const existingPeople = peopleForTheseFaces.map((face) => face.People
    .filter((person) => person.Match >= MATCH_THRESHOLD)
    .map((person) => person.Person))
    .filter((peopleForFace) => peopleForFace.length > 0)
    .reduce((allPeopleForFaces, peopleForFace) => allPeopleForFaces.concat(peopleForFace), []);

  const combinedPeople: string[] = existingPeople.concat(updatedPeople.map((newPerson) => newPerson.id));
  const uniquePeople: string[] = [...new Set(combinedPeople)];
  return {
    faceMatches: peopleForTheseFaces,
    people: uniquePeople,
  };
}
export function getUpdatePathParameters(newImage: IImage): IPathParameters {
  return {
    id: newImage.id,
    username: newImage.username,
  };
}

export function getInvokeUpdateParams(pathParameters, body): InvocationRequest {
  return {
    FunctionName: process.env.IS_OFFLINE ? "update" : `${process.env.LAMBDA_PREFIX}update`,
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    LogType: "Tail",
    Payload: JSON.stringify({
      body: JSON.stringify(body),
      pathParameters,
    }),
  };
}

export function getLogFields({
  newImage,
  updateBody,
  existingPeople,
  facesWithPeople,
  updatedPeople,
  newPeopleInThisImage,
}: ILoggerFacesParams) {
  return {
    existingPeopleRaw: existingPeople,
    facesWithPeopleRaw: facesWithPeople,
    imageBirthtime: newImage.birthtime,
    imageCreatedAt: newImage.createdAt,
    imageFaceMatchCount: updateBody && safeLength(updateBody.faceMatches),
    imageFacesCount: safeLength(newImage.faces),
    imageFacesWithPeopleCount: safeLength(facesWithPeople),
    imageFamilyGroup: newImage.group,
    imageHeight: newImage.meta && newImage.meta.height,
    imageId: newImage.id,
    imageKey: newImage.img_key,
    imagePeopleCount: updateBody && safeLength(updateBody.people),
    imageTagCount: safeLength(newImage.tags),
    imageUpdatedAt: newImage.updatedAt,
    imageUserIdentityId: newImage.userIdentityId,
    imageUsername: newImage.username,
    imageWidth: newImage.meta && newImage.meta.width,
    newPeopleCount: safeLength(newPeopleInThisImage),
    peopleCount: safeLength(existingPeople),
    updatedPeopleCount: safeLength(updatedPeople),
  };
}

export async function addToPerson(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
  const startTime: number = Date.now();
  const eventBodyObj = event.body ? JSON.parse(event.body) : null;
  const newImage = eventBodyObj.image;
  const s3 = createS3Client();
  const bucket: string | undefined = process.env.S3_BUCKET;
  const key: string | undefined = PEOPLE_KEY;
  const logBaseParams: ILoggerBaseParams = {
    name: "addToPerson",
    parentId: eventBodyObj.traceMeta && eventBodyObj.traceMeta.parentId,
    spanId: uuid.v1(),
    timestamp: startTime,
    traceId: eventBodyObj.traceMeta && eventBodyObj.traceMeta.parentId,
  };
  try {
    const existingPeople: IPerson[] = await getExistingPeople(s3, bucket, key);
    const facesWithPeople: IFaceWithPeople[] = await getPeopleForFaces(newImage, existingPeople, getFaceMatch);
    const newPeopleInThisImage: IPerson[] = getNewPeople(facesWithPeople);
    if (newPeopleInThisImage.length > 0) {
      invokePeopleThumbEvents(newPeopleInThisImage, logBaseParams);
    }
    const updatedPeople: IPerson[] = getUpdatedPeople(existingPeople, facesWithPeople, newPeopleInThisImage);
    const putPeoplePromise: Promise<PutObjectOutput> = putPeople(s3, updatedPeople, bucket, key);
    const pathParameters: IPathParameters = getUpdatePathParameters(newImage);
    const updateBody: IUpdateBody = getUpdateBody(facesWithPeople, newPeopleInThisImage);
    const updateParams: InvocationRequest = getInvokeUpdateParams(pathParameters, updateBody);
    await lambda.invoke(updateParams).promise();
    const logMetaParams = {
      existingPeople,
      facesWithPeople,
      newImage,
      newPeopleInThisImage,
      updateBody,
      updatedPeople,
    };
    await putPeoplePromise;
    logger(context, logBaseParams, getLogFields(logMetaParams));
    return callback(null, success({ logMetaParams }));
  } catch (err) {
    logger(context, logBaseParams, {
      err,
      ...getLogFields({
        newImage,
      }),
    });
    return callback(null, failure(err));
  }
}
