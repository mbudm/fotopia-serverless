import {
  InvocationRequest,
} from "aws-sdk/clients/lambda";
import { INVOCATION_EVENT } from "../lib/constants";
import lambda from "../lib/lambda";
import {
  IPerson,
} from "../types";

export function getInvokeUpdateParams(body: IPerson[], traceMeta): InvocationRequest {
  return {
    FunctionName: process.env.IS_OFFLINE ? "peopleUpdate" : `${process.env.LAMBDA_PREFIX}peopleUpdate`,
    InvocationType: INVOCATION_EVENT,
    LogType: "Tail",
    Payload: JSON.stringify({
      body: JSON.stringify({
        ...body,
        traceMeta,
      }),
    }),
  };
}

export default function invokePutPeople(body, traceMeta) {
  const params = getInvokeUpdateParams(body, traceMeta);
  return lambda.invoke(params).promise();
}
