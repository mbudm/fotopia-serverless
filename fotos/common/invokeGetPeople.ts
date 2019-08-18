import {
  InvocationRequest,
  InvocationResponse,
} from "aws-sdk/clients/lambda";
import { JSONParseError } from "../errors/jsonParse";
import { INVOCATION_REQUEST_RESPONSE } from "../lib/constants";
import lambda from "../lib/lambda";
import {
  IPerson,
} from "../types";

export function getInvokeGetPeopleParams(): InvocationRequest {
  return {
    FunctionName: process.env.IS_OFFLINE ? "people" : `${process.env.LAMBDA_PREFIX}people`,
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    LogType: "Tail",
  };
}

export default function invokeGetPeople() {
  const params = getInvokeGetPeopleParams();
  return lambda.invoke(params).promise()
    .then((invocationResponse: InvocationResponse) => {
      try {
        const payload = JSON.parse(invocationResponse.Payload as string);
        const peopleObject: IPerson[] = JSON.parse(payload.body);
        return peopleObject;
      } catch (e) {
        // tslint:disable-next-line:max-line-length
        throw new JSONParseError(e, `invokeGetPeople, invocationResponse is : ${JSON.stringify(invocationResponse)}`);
      }
    })
    .catch((e) => {
      throw new JSONParseError(e, "invokeGetImageRecord");
    });
}
