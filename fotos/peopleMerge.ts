
import * as uuid from "uuid";
import { safeLength } from "./create";
import { getExistingPeople, putPeople } from "./faces";
import {
  INVOCATION_EVENT,
  INVOCATION_REQUEST_RESPONSE,
  PEOPLE_KEY,
} from "./lib/constants";
import lambda from "./lib/lambda";
import logger from "./lib/logger";
import { failure, success } from "./lib/responses";
import createS3Client from "./lib/s3";
import {
  ILoggerBaseParams,
} from "./types";

export function mergePeopleObjects(data, existingPeople) {
  const mergedPeople = existingPeople
    .filter((person) => data.includes(person.id))
    .map((person) => ({ ...person, faces: [...person.faces] }));
  const mainPerson = mergedPeople
    .reduce((accum, person) => (accum.faces.length > person.faces.length ?
      accum : person), { faces: [] });
  mainPerson.faces = mergedPeople
    .reduce((accum, person) => {
      const uniqFaces = person.faces.filter((face) => !accum.find((f) => f.FaceId === face.FaceId));
      return accum.concat(uniqFaces);
    }, []);
  return mainPerson;
}
export function getDeletePeople(data, mergedPerson, existingPeople) {
  return data.filter((pid) => pid !== mergedPerson.id)
    .map((pid2) => existingPeople.find((p) => pid2 === p.id));
}

export function getInvokeQueryParams(deletedPeople, mergedPerson) {
  const body = {
    criteria: {
      people: deletedPeople.map((person) => person.id).concat(mergedPerson.id),
    },
    from: 0,
    to: Date.now(),
  };
  return {
    FunctionName: process.env.IS_OFFLINE ? "query" : `${process.env.LAMBDA_PREFIX}query`,
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    LogType: "Tail",
    Payload: JSON.stringify({
      body: JSON.stringify(body),
    }),
  };
}
// need to query the images so we can modify just the deleted person id
// RDBMS may be more efficient here where we could remove selected people
// or use aliases for people in all searches
// first see how this goes
// doing the updates as events so it might be fine
export async function queryImagesByPeople(deletePeople, mergedPerson) {
  const params = getInvokeQueryParams(deletePeople, mergedPerson);
  return lambda.invoke(params).promise()
    .then((response) => {
      const payload = typeof response.Payload === "string" ? JSON.parse(response.Payload) : null ;
      const body = payload && JSON.parse(payload.body);
      return Array.isArray(body) ? body : [];
    });
}

export function getInvokeUpdateParams(pathParameters, body) {
  return {
    FunctionName: process.env.IS_OFFLINE ? "update" : `${process.env.LAMBDA_PREFIX}update`,
    InvocationType: INVOCATION_EVENT,
    LogType: "Tail",
    Payload: JSON.stringify({
      body: JSON.stringify(body),
      pathParameters,
    }),
  };
}

export function getAllInvokeUpdateParams(imagesWithAffectedPeople, mergedPerson, deletePeople) {
  return imagesWithAffectedPeople.map((image) => {
    const pathParameters = {
      id: image.id,
      username: image.username,
    };
    const body = {
      people: image.people.filter((p) => !deletePeople.find((dp) => dp.id === p))
        .concat((image.people.includes(mergedPerson.id) ? [] : [mergedPerson.id])),
    };
    return getInvokeUpdateParams(pathParameters, body);
  });
}

export async function updatedImages(imagesWithAffectedPeople, mergedPerson, deletePeople) {
  const allParams = Array.isArray(imagesWithAffectedPeople) ?
    getAllInvokeUpdateParams(imagesWithAffectedPeople, mergedPerson, deletePeople) :
    [];
  return Promise.all(allParams.map((params) => lambda.invoke(params).promise()));
}

export function getUpdatedPeople(existingPeople, mergedPerson, deletePeople) {
  return existingPeople.filter((p) => !deletePeople.find((dp) => dp.id === p.id))
    .map((person) => (mergedPerson.id === person.id ?
      mergedPerson :
      person));
}

export function getLogFields({
  data,
  existingPeople,
  mergedPerson,
  deletePeople,
  imagesWithAffectedPeople,
  updatedPeople,
}) {
  return {
    mergeDeletePeopleCount: safeLength(deletePeople),
    mergeImagesWithAffectedPeopleCount: safeLength(imagesWithAffectedPeople),
    mergeImagesWithAffectedPeopleRaw: imagesWithAffectedPeople,
    mergePersonFacesCount: mergedPerson && safeLength(mergedPerson.faces),
    mergePersonId: mergedPerson && mergedPerson.id,
    mergeRequestPeopleCount: safeLength(data),
    peopleCount: existingPeople && safeLength(existingPeople),
    updatedPeopleCount: safeLength(updatedPeople),
  };
}

export async function mergePeople(event, context, callback) {
  const startTime = Date.now();
  const s3 = createS3Client();
  const bucket = process.env.S3_BUCKET;
  const key = PEOPLE_KEY;
  const data = event.body ? JSON.parse(event.body) : null;
  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "mergePeople",
    parentId: "",
    startTime,
    traceId: uuid.v1(),
  };
  try {
    const existingPeople = await getExistingPeople(s3, bucket, key);
    const mergedPerson = mergePeopleObjects(data, existingPeople);
    const deletePeople = getDeletePeople(data, mergedPerson, existingPeople);
    const imagesWithAffectedPeople = await queryImagesByPeople(deletePeople, mergedPerson);
    await updatedImages(imagesWithAffectedPeople, mergedPerson, deletePeople);
    const updatedPeople = getUpdatedPeople(existingPeople, mergedPerson, deletePeople);
    putPeople(s3, updatedPeople, bucket, key);
    logger(context, loggerBaseParams, getLogFields({
      data,
      deletePeople,
      existingPeople,
      imagesWithAffectedPeople,
      mergedPerson,
      updatedPeople,
    }));
    return callback(null, success(existingPeople));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields({
      data,
      deletePeople: null,
      existingPeople: null,
      imagesWithAffectedPeople: null,
      mergedPerson: null,
      updatedPeople: null,
    }) });
    return callback(null, failure(err));
  }
}
