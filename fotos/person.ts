import * as uuid from "uuid";
import invokeGetPeople from "./common/invokeGetPeople";
import invokeUpdatePeople from "./common/invokePutPeople";
import { failure, success } from "./common/responses";
import { safeLength } from "./create";
import { PEOPLE_KEY } from "./lib/constants";
import logger from "./lib/logger";
import createS3Client from "./lib/s3";
import {
  ILoggerBaseParams,
  IPerson,
} from "./types";

export function getUpdatedPeople(existingPeople, data, pathParams) {
  const updatedPeople = existingPeople.map((person) => ({
    ...person,
    name: pathParams.id === person.id ? data.name : person.name,
  }));

  return updatedPeople;
}

export function getPersonFaces(people, personId) {
  const person = people.find((p) => p.id === personId);
  return person && person.faces;
}

export function getLogFields(existingPeople: IPerson[], updatedPeople: IPerson[], pathParams) {
  return {
    peopleCount: safeLength(existingPeople),
    personFacesCount: safeLength(getPersonFaces(updatedPeople, pathParams.id)),
    personId: pathParams.id,
    updatedPeopleCount: safeLength(updatedPeople),
  };
}

export async function updatePerson(event, context, callback) {
  const startTime = Date.now();
  const s3 = createS3Client();
  const bucket = process.env.S3_BUCKET;
  const key = PEOPLE_KEY;
  const data = event.body ? JSON.parse(event.body) : null;
  const pathParams = event.pathParameters;
  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "updatePerson",
    parentId: "",
    startTime,
    traceId: uuid.v1(),
  };
  try {
    const existingPeople = await invokeGetPeople();
    const updatedPeople = getUpdatedPeople(existingPeople, data, pathParams);
    const putPeopleResponse = await invokeUpdatePeople(updatedPeople);
    logger(context, loggerBaseParams, getLogFields(existingPeople, updatedPeople, pathParams));
    return callback(null, success({ putPeopleResponse, updatedPeople }));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(new Array<IPerson>(), new Array<IPerson>(), pathParams) });
    return callback(null, failure(err));
  }
}
