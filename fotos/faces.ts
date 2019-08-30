import { APIGatewayProxyEvent, Callback, Context } from "aws-lambda";
import { InvocationRequest } from "aws-sdk/clients/lambda";
import { FaceMatch, FaceMatchList } from "aws-sdk/clients/rekognition";
import { SearchFacesRequest } from "aws-sdk/clients/rekognition";
import * as Sharp from "sharp";
import * as uuid from "uuid";
import { getTraceMeta } from "./common/getTraceMeta";
import invokeGetPeople from "./common/invokeGetPeople";
import invokePutPeople from "./common/invokePutPeople";
import { failure, success } from "./common/responses";
import { safeLength } from "./create";
import {
  EXIF_ORIENT,
  INVOCATION_EVENT,
  INVOCATION_REQUEST_RESPONSE,
} from "./lib/constants";
import lambda from "./lib/lambda";
import logger from "./lib/logger";
import rekognition from "./lib/rekognition";
import { getDims } from "./personThumb";
import {
  IFace,
  IFaceDimensions,
  IFaceMatcherCallback,
  IFaceMatcherCallbackResponse,
  IFaceWithPeople,
  IImage,
  ILoggerBaseParams,
  ILoggerFacesParams,
  IPathParameters,
  IPerson,
  IPersonMatch,
  ITraceMeta,
  IUpdateBody,
} from "./types";

const MATCH_THRESHOLD = 80;
const PERSON_THUMB_SUFFIX = "-face-";
const fotopiaGroup = process.env.FOTOPIA_GROUP || "";
const PERSON_THUMB_MIN = 40; // if the thumb is less that this, dont bother creating a person

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
  faceMatcher: IFaceMatcherCallback,
): Promise<IFaceWithPeople[]> {
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
          Landmarks: face.FaceDetail!.Landmarks,
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
  const key = newFace.img_key.substr(0, newFace.img_key.lastIndexOf(ext) - 1);
  return `${key}${PERSON_THUMB_SUFFIX}-${newFace.FaceId}.${ext}`;
}

export function filterNewPeopleThatAreTooSmall(newPeople: IPerson[]): IPerson[] {
  return newPeople.filter((person) => {
    const mockSharpMeta: Sharp.Metadata = {
      chromaSubsampling: "4:2:0",
      orientation: EXIF_ORIENT.TOP_LEFT,
    };
    const dims: IFaceDimensions = getDims(person, mockSharpMeta);
    return dims.width >= PERSON_THUMB_MIN;
  });
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
    landMarks: newFace.Landmarks,
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
    FunctionName: `${process.env.LAMBDA_PREFIX}personThumb`,
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

export function invokePeopleThumbEvents(newPeopleInThisImage: IPerson[], logBaseParams: ILoggerBaseParams): void {
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
  const existingPeopleIds: string[] = peopleForTheseFaces.map((face) => face.People
    .filter((person) => person.Match >= MATCH_THRESHOLD)
    .map((person) => person.Person))
    .filter((peopleForFace) => peopleForFace.length > 0)
    .reduce((allPeopleForFaces, peopleForFace) => allPeopleForFaces.concat(peopleForFace), []);

  const combinedPeopleIds: string[] = existingPeopleIds.concat(updatedPeople.map((newPerson) => newPerson.id));
  const uniquePeopleIds: string[] = [...new Set(combinedPeopleIds)];
  return {
    faceMatches: peopleForTheseFaces,
    people: uniquePeopleIds,
  };
}
export function getUpdatePathParameters(newImage: IImage): IPathParameters {
  return {
    id: newImage.id,
    username: newImage.username,
  };
}

export function getInvokeUpdateParams(
  pathParameters: IPathParameters, body: IUpdateBody, traceMeta: ITraceMeta,
): InvocationRequest {
  const bodyWithMeta: IUpdateBody = {
    ...body,
    traceMeta,
  };
  return {
    FunctionName: `${process.env.LAMBDA_PREFIX}update`,
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    LogType: "Tail",
    Payload: JSON.stringify({
      body: JSON.stringify(bodyWithMeta),
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
  newPeopleThatAreOkSize,
}: ILoggerFacesParams) {
  return {
    facesWithPeopleRaw: facesWithPeople,
    imageBirthtime: newImage.birthtime,
    imageCreatedAt: newImage.createdAt,
    imageFaceMatchCount: updateBody && safeLength(updateBody.faceMatches),
    imageFacesCount: newImage && newImage.faces && safeLength(newImage.faces),
    imageFacesWithPeopleCount: facesWithPeople && safeLength(facesWithPeople),
    imageFamilyGroup: newImage.group,
    imageHeight: newImage.meta && newImage.meta.height,
    imageId: newImage.id,
    imageKey: newImage.img_key,
    imagePeopleCount: updateBody && safeLength(updateBody.people),
    imageTagCount: newImage && newImage.tags && safeLength(newImage.tags),
    imageUpdatedAt: newImage.updatedAt,
    imageUserIdentityId: newImage.userIdentityId,
    imageUsername: newImage.username,
    imageWidth: newImage.meta && newImage.meta.width,
    newPeopleAllSizesCount: newPeopleInThisImage && safeLength(newPeopleInThisImage),
    newPeopleCount: newPeopleThatAreOkSize && safeLength(newPeopleThatAreOkSize),
    newPeopleRaw: newPeopleThatAreOkSize,
    peopleCount: existingPeople && safeLength(existingPeople),
    updatedPeopleCount: updatedPeople && safeLength(updatedPeople),
  };
}

export async function addToPerson(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
  const startTime: number = Date.now();
  const eventBodyObj = event.body ? JSON.parse(event.body) : null;
  const newImage: IImage = eventBodyObj.image;
  const logBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "addToPerson",
    parentId: eventBodyObj.traceMeta && eventBodyObj.traceMeta.parentId || "",
    startTime,
    traceId: eventBodyObj.traceMeta && eventBodyObj.traceMeta.traceId,
  };
  try {
    const existingPeople: IPerson[] = await invokeGetPeople();
    const facesWithPeople: IFaceWithPeople[] = await getPeopleForFaces(newImage, existingPeople, getFaceMatch);
    const newPeopleInThisImage: IPerson[] = getNewPeople(facesWithPeople);
    const newPeopleThatAreOkSize: IPerson[] = filterNewPeopleThatAreTooSmall(newPeopleInThisImage);
    if (newPeopleThatAreOkSize.length > 0) {
      invokePeopleThumbEvents(newPeopleThatAreOkSize, logBaseParams);
    }
    const updatedPeople: IPerson[] = getUpdatedPeople(existingPeople, facesWithPeople, newPeopleThatAreOkSize);
    await invokePutPeople(updatedPeople, getTraceMeta(logBaseParams));
    const pathParameters: IPathParameters = getUpdatePathParameters(newImage);
    const updateBody: IUpdateBody = getUpdateBody(facesWithPeople, newPeopleThatAreOkSize);
    const updateParams: InvocationRequest = getInvokeUpdateParams(
      pathParameters, updateBody, getTraceMeta(logBaseParams),
    );
    await lambda.invoke(updateParams).promise();
    const logMetaParams: ILoggerFacesParams = {
      existingPeople,
      facesWithPeople,
      newImage,
      newPeopleInThisImage,
      newPeopleThatAreOkSize,
      updateBody,
      updatedPeople,
    };
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
