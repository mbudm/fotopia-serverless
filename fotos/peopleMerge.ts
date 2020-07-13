import { APIGatewayProxyEvent, Callback, Context } from "aws-lambda";
import { InvocationRequest, InvocationResponse } from "aws-sdk/clients/lambda";
import * as uuid from "uuid";
import { getTraceMeta } from "./common/getTraceMeta";
import invokeGetPeople from "./common/invokeGetPeople";
import invokePutPeople from "./common/invokePutPeople";
import { failure, success } from "./common/responses";
import { safeLength } from "./create";
import {
  INVOCATION_EVENT,
  INVOCATION_REQUEST_RESPONSE,
} from "./lib/constants";
import lambda from "./lib/lambda";
import logger from "./lib/logger";
import {
  IFace,
  ILoggerBaseParams,
  ILoggerPeopleMergeParams,
  IPathParameters,
  IPeopleMergeRequestBody,
  IPerson,
  IQueryBody,
  IQueryDBResponseItem,
  IQueryResponse,
  IUpdateBody,
} from "./types";

export function mergePeopleObjects(mergePeopleIds: string[], existingPeople: IPerson[]): IPerson {
  const mergedPeople: IPerson[] = existingPeople
    .filter((person) => mergePeopleIds.includes(person.id))
    .map((person) => ({
      ...person,
      faces: (Array.isArray(person.faces) ? [...person.faces] : []),
    }));
  const mainPerson: IPerson = getMergePerson(mergedPeople);
  if (mainPerson) {
    mainPerson.faces = combineFaces(mergedPeople);
    return mainPerson;
  } else {
    throw new Error(
      `No main person identified from mergePeopleIds:
      ${mergePeopleIds.toString()}, mergedPeople len:
      ${mergedPeople.length}`,
    );
  }
}

export function combineFaces(mergedPeople: IPerson[]): IFace[] {
  return mergedPeople
    .reduce((accum, person: IPerson) => {
      const uniqFacesInPerson: IFace[] = Array.isArray(person.faces) ?
        person.faces.filter(
          (face: IFace) => !accum.find((f) => f.FaceId === face.FaceId),
        ) :
        [];
      return accum.concat(uniqFacesInPerson);
    }, new Array<IFace>());
}

export function getMergePerson(mergedPeople: IPerson[]): IPerson {

  return mergedPeople
    .reduce((accum, person) => {
        const accumFacesLength = Array.isArray(accum.faces) ? accum.faces.length : 0;
        const personFacesLength = Array.isArray(person.faces) ? person.faces.length : 0;
        return accumFacesLength >= personFacesLength ?
          accum :
          person;
      }, mergedPeople[0]);
}

export function getDeletePeople(mergePeopleIds: string[], mergedPerson: IPerson, existingPeople: IPerson[]): IPerson[] {
  return mergePeopleIds.filter((pid) => pid !== mergedPerson.id)
    .map((pid2) => existingPeople.find((p) => pid2 === p.id)) as IPerson[];
}

export function getInvokeQueryParams(
  deletedPeople: IPerson[],
  mergedPerson: IPerson,
  loggerBaseParams: ILoggerBaseParams,
  context: Context,
): InvocationRequest {
  const body: IQueryBody = {
    breakDateRestriction: true,
    clientId: context.functionName,
    criteria: {
      people: deletedPeople.map((person) => person.id).concat(mergedPerson.id),
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
        ...body,
        traceMeta: getTraceMeta(loggerBaseParams),
      }),
    }),
  };
}
// need to query the images so we can modify just the deleted person id
// RDBMS may be more efficient here where we could remove selected people
// or use aliases for people in all searches
// first see how this goes
// doing the updates as events so it might be fine
export async function queryImagesByPeople(
  deletedPeople: IPerson[],
  mergedPerson: IPerson,
  loggerBaseParams: ILoggerBaseParams,
  context: Context,
): Promise<IQueryDBResponseItem[]> {
  const params = getInvokeQueryParams(deletedPeople, mergedPerson, loggerBaseParams, context);
  return lambda.invoke(params).promise()
    .then((response) => {
      const payload = typeof response.Payload === "string" ? JSON.parse(response.Payload) : null ;
      const body: IQueryResponse = payload && JSON.parse(payload.body);
      return body.items;
    });
}

export function getInvokeUpdateParams(
  pathParameters: IPathParameters,
  body: IUpdateBody,
  loggerBaseParams: ILoggerBaseParams,
): InvocationRequest {
  return {
    FunctionName: `${process.env.LAMBDA_PREFIX}update`,
    InvocationType: INVOCATION_EVENT,
    LogType: "Tail",
    Payload: JSON.stringify({
      body: JSON.stringify({
        ...body,
        traceMeta: getTraceMeta(loggerBaseParams),
      }),
      pathParameters,
    }),
  };
}

export function getAllInvokeUpdateParams(
  imagesWithAffectedPeople: IQueryDBResponseItem[],
  mergedPerson: IPerson,
  deletePeople: IPerson[],
  loggerBaseParams: ILoggerBaseParams,
): InvocationRequest[] {
  return imagesWithAffectedPeople.map((image) => {
    const pathParameters = {
      id: image.id,
      username: image.username,
    };
    const body = {
      people: image.people ?
        image.people.filter((p) => !deletePeople.find((dp) => dp.id === p))
          .concat((image.people.includes(mergedPerson.id) ? [] : [mergedPerson.id])) :
        [] as string[],
    };
    return getInvokeUpdateParams(pathParameters, body, loggerBaseParams);
  });
}

export async function updatedImages(
  imagesWithAffectedPeople: IQueryDBResponseItem[],
  mergedPerson: IPerson,
  deletePeople: IPerson[],
  loggerBaseParams: ILoggerBaseParams,
): Promise<InvocationResponse[]> {
  const allParams = Array.isArray(imagesWithAffectedPeople) ?
    getAllInvokeUpdateParams(imagesWithAffectedPeople, mergedPerson, deletePeople, loggerBaseParams) :
    [];
  return Promise.all(allParams.map((params) => lambda.invoke(params).promise()));
}

export function getUpdatedPeople(
  existingPeople: IPerson[],
  mergedPerson: IPerson,
  deletePeople: IPerson[],
): IPerson[] {
  return existingPeople.filter((p) => !deletePeople.find((dp) => dp.id === p.id))
    .map((person) => (mergedPerson.id === person.id ?
      mergedPerson :
      person));
}

export function getLogFields({
  mergePeopleIds,
  existingPeople,
  mergedPerson,
  deletePeople,
  imagesWithAffectedPeople,
  updatedPeople,
}: ILoggerPeopleMergeParams) {
  return {
    mergeDeletePeopleCount: safeLength(deletePeople),
    mergeImagesWithAffectedPeopleCount: safeLength(imagesWithAffectedPeople),
    mergeImagesWithAffectedPeopleRaw: imagesWithAffectedPeople,
    mergePersonFacesCount: mergedPerson && safeLength(mergedPerson.faces),
    mergePersonId: mergedPerson && mergedPerson.id,
    mergeRequestPeopleCount: safeLength(mergePeopleIds),
    peopleCount: existingPeople && safeLength(existingPeople),
    updatedPeopleCount: safeLength(updatedPeople),
  };
}

export async function mergePeople(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
  const startTime = Date.now();
  const eventBodyParsed: IPeopleMergeRequestBody | undefined = event.body && JSON.parse(event.body);
  const mergePeopleIds: string[] = eventBodyParsed ? eventBodyParsed.people : [];
  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "mergePeople",
    parentId: "",
    startTime,
    traceId: uuid.v1(),
  };
  try {
    const existingPeople = await invokeGetPeople(getTraceMeta(loggerBaseParams));
    const mergedPerson = mergePeopleObjects(mergePeopleIds, existingPeople);
    const deletePeople = getDeletePeople(mergePeopleIds, mergedPerson, existingPeople);
    const imagesWithAffectedPeople = await queryImagesByPeople(deletePeople, mergedPerson, loggerBaseParams, context);
    await updatedImages(imagesWithAffectedPeople, mergedPerson, deletePeople, loggerBaseParams);
    const updatedPeople = getUpdatedPeople(existingPeople, mergedPerson, deletePeople);
    invokePutPeople(updatedPeople, getTraceMeta(loggerBaseParams));
    logger(context, loggerBaseParams, getLogFields({
      deletePeople,
      existingPeople,
      imagesWithAffectedPeople,
      mergePeopleIds,
      mergedPerson,
      updatedPeople,
    }));
    return callback(null, success(existingPeople));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields({} as ILoggerPeopleMergeParams) });
    return callback(null, failure(err));
  }
}
