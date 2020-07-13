import {
  InvocationRequest,
  InvocationResponse,
} from "aws-sdk/clients/lambda";
import { JSONParseError } from "../errors/jsonParse";
import { INVOCATION_REQUEST_RESPONSE } from "../lib/constants";
import lambda from "../lib/lambda";
import {
  IPerson, ITraceMeta,
} from "../types";

export function getInvokeGetPeopleParams(traceMeta?: ITraceMeta): InvocationRequest {
  const Payload = traceMeta && JSON.stringify({
    body: JSON.stringify({
      traceMeta,
    }),
  });
  return {
    FunctionName: `${process.env.LAMBDA_PREFIX}people`,
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    LogType: "Tail",
    Payload,
  };
}

export default function invokeGetPeople(traceMeta?) {
  const params = getInvokeGetPeopleParams(traceMeta);
  return lambda.invoke(params).promise()
    .then((invocationResponse: InvocationResponse) => {
      try {
        const payload = JSON.parse(invocationResponse.Payload as string);
        const peopleObject: IPerson[] = typeof payload === "object" ? JSON.parse(payload.body) : [];
        return peopleObject;
      } catch (e) {
        // tslint:disable-next-line:max-line-length
        throw new JSONParseError(e, `invokeGetPeople, invocationResponse is : ${JSON.stringify(invocationResponse)}`);
      }
    })
    .catch((e) => {
      throw new JSONParseError(e, "invokeGetPeople");
    });
}
