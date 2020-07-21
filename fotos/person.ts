import { APIGatewayProxyEvent, Callback, Context } from "aws-lambda";
import { InvocationResponse } from "aws-sdk/clients/lambda";
import * as uuid from "uuid";
import { getTraceMeta } from "./common/getTraceMeta";
import invokeGetPeople from "./common/invokeGetPeople";
import invokePutPeople from "./common/invokePutPeople";
import { failure, success } from "./common/responses";
import { safeLength } from "./create";
import logger from "./lib/logger";
import {
  IFace,
  ILoggerBaseParams,
  IPerson,
  IPersonPathParameters,
  IPersonUpdateBody,
} from "./types";

export function getUpdatedPeople(
  existingPeople: IPerson[],
  requestBody: IPersonUpdateBody,
  pathParams: IPersonPathParameters,
): IPerson[] {
  const updatedPeople = existingPeople.map((person) => ({
    ...person,
    name: pathParams.id === person.id ? requestBody.name : person.name,
  }));
  return updatedPeople;
}

export function getPersonFaces(people: IPerson[], personId: string): IFace[] {
  const person = people.find((p) => p.id === personId);
  return person ? person.faces : [] as IFace[];
}

export function getLogFields(
  existingPeople: IPerson[],
  updatedPeople: IPerson[],
  pathParams: IPersonPathParameters,
) {
  return {
    peopleCount: safeLength(existingPeople),
    personFacesCount: safeLength(getPersonFaces(updatedPeople, pathParams.id)),
    personId: pathParams.id,
    updatedPeopleCount: safeLength(updatedPeople),
  };
}

export async function updatePerson(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
  const startTime: number = Date.now();
  const requestBody: IPersonUpdateBody = event.body ? JSON.parse(event.body) : null;
  const pathParams: IPersonPathParameters = {
    id: event && event.pathParameters && event!.pathParameters!.id! || "",
  };
  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "updatePerson",
    parentId: "",
    startTime,
    traceId: uuid.v1(),
  };
  try {
    const existingPeople: IPerson[] = await invokeGetPeople(getTraceMeta(loggerBaseParams));
    const updatedPeople: IPerson[] = getUpdatedPeople(existingPeople, requestBody, pathParams);
    const putPeopleResponse: Promise<InvocationResponse> = invokePutPeople(
      updatedPeople,
      getTraceMeta(loggerBaseParams),
    );
    logger(context, loggerBaseParams, getLogFields(existingPeople, updatedPeople, pathParams));
    return callback(null, success({ putPeopleResponse, updatedPeople }));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(new Array<IPerson>(), new Array<IPerson>(), pathParams) });
    return callback(null, failure(err));
  }
}
