import { Callback, Context, DynamoDBRecord, DynamoDBStreamEvent, StreamRecord} from "aws-lambda";
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
  ILoggerParams,
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

export function getNewImageRecords(records: DynamoDBRecord[]): IImage[] {
  return records.filter((record) => record.dynamodb &&
    record.dynamodb.NewImage &&
    !record.dynamodb.OldImage)
    .map((record: DynamoDBRecord) => {
      const ddbRec: StreamRecord = record.dynamodb || {};
      return {
        ...ddbAttVals.unwrap(ddbRec.Keys),
        ...ddbAttVals.unwrap(ddbRec.NewImage),
      };
    });
}

// can there be multiple insert records in one event? probably?
export function getPeopleForFaces(
  newImages: IImage[],
  existingPeople: IPerson[],
  faceMatcher: IFaceMatcherCallback): Promise<IFaceWithPeople[]> {
  return Promise.all(newImages[0].faces
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
            height: newImages[0].meta && newImages[0].meta.height,
            width: newImages[0].meta && newImages[0].meta.width,
          },
          People: peopleMatches,
          img_key: newImages[0].img_key,
          userIdentityId: newImages[0].userIdentityId,
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

export function getInvokePersonThumbParams(personInThisImage: IPerson): InvocationRequest {
  return {
    FunctionName: process.env.IS_OFFLINE ? "personThumb" : `${process.env.LAMBDA_PREFIX}personThumb`,
    InvocationType: INVOCATION_EVENT,
    LogType: "None",
    Payload: JSON.stringify({
      body: JSON.stringify(personInThisImage),
    }),
  };
}

export function invokePeopleThumbEvents(newPeopleInThisImage: IPerson[]) {
  newPeopleInThisImage.forEach((person) => {
    const newPersonThumbParams: InvocationRequest = getInvokePersonThumbParams(person);
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
export function getUpdatePathParameters(newImages): IPathParameters {
  return {
    id: newImages[0].id,
    username: newImages[0].username,
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
  newImages,
  eventRecords,
  updateBody,
  existingPeople,
  facesWithPeople,
  updatedPeople,
  newPeopleInThisImage,
}: ILoggerParams) {
  const firstNewImage = newImages[0] || {};
  return {
    ddbEventInsertRecordsCount: newImages.length,
    ddbEventRecordsCount: safeLength(eventRecords),
    ddbEventRecordsRaw: eventRecords,
    existingPeopleRaw: existingPeople,
    facesWithPeopleRaw: facesWithPeople,
    imageBirthtime: firstNewImage.birthtime,
    imageCreatedAt: firstNewImage.createdAt,
    imageFaceMatchCount: updateBody && safeLength(updateBody.faceMatches),
    imageFacesCount: safeLength(firstNewImage.faces),
    imageFacesWithPeopleCount: safeLength(facesWithPeople),
    imageFamilyGroup: firstNewImage.group,
    imageHeight: firstNewImage.meta && firstNewImage.meta.height,
    imageId: firstNewImage.id,
    imageKey: firstNewImage.img_key,
    imagePeopleCount: updateBody && safeLength(updateBody.people),
    imageTagCount: safeLength(firstNewImage.tags),
    imageUpdatedAt: firstNewImage.updatedAt,
    imageUserIdentityId: firstNewImage.userIdentityId,
    imageUsername: firstNewImage.username,
    imageWidth: firstNewImage.meta && firstNewImage.meta.width,
    newPeopleCount: safeLength(newPeopleInThisImage),
    peopleCount: safeLength(existingPeople),
    updatedPeopleCount: safeLength(updatedPeople),
  };
}

export async function addToPerson(event: DynamoDBStreamEvent, context: Context, callback: Callback): Promise<void> {
  const startTime: number = Date.now();
  const newImages: IImage[] = getNewImageRecords(event.Records);
  const s3 = createS3Client();
  const bucket: string | undefined = process.env.S3_BUCKET;
  const key: string | undefined = PEOPLE_KEY;
  let logMetaParams: ILoggerParams = {
    eventRecords: event.Records,
    newImages,
  };
  try {
    if (newImages.length > 0) {
      // todo handle multiple new image records if feasible scenario - it is eg two uploads
      const existingPeople: IPerson[] = await getExistingPeople(s3, bucket, key);
      const facesWithPeople: IFaceWithPeople[] = await getPeopleForFaces(newImages, existingPeople, getFaceMatch);
      const newPeopleInThisImage: IPerson[] = getNewPeople(facesWithPeople);
      if (newPeopleInThisImage.length > 0) {
        invokePeopleThumbEvents(newPeopleInThisImage);
      }
      const updatedPeople: IPerson[] = getUpdatedPeople(existingPeople, facesWithPeople, newPeopleInThisImage);
      const putPeoplePromise: Promise<PutObjectOutput> = putPeople(s3, updatedPeople, bucket, key);
      const pathParameters: IPathParameters = getUpdatePathParameters(newImages);
      const updateBody: IUpdateBody = getUpdateBody(facesWithPeople, newPeopleInThisImage);
      const updateParams: InvocationRequest = getInvokeUpdateParams(pathParameters, updateBody);
      await lambda.invoke(updateParams).promise();
      logMetaParams = {
        ...logMetaParams,
        existingPeople,
        facesWithPeople,
        newPeopleInThisImage,
        updateBody,
        updatedPeople,
      };
      await putPeoplePromise;
    }
    logger(context, startTime, getLogFields(logMetaParams));
    return callback(null, success({ logMetaParams }));
  } catch (err) {
    logger(context, startTime, { err, ...getLogFields(logMetaParams) });
    return callback(null, failure(err));
  }
}
