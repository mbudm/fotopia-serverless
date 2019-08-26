import {
  InvocationRequest,
} from "aws-sdk/clients/lambda";
import { INVOCATION_EVENT } from "../lib/constants";
import lambda from "../lib/lambda";
import {
  IIndex,
} from "../types";

export function getInvokeUpdateParams(body: IIndex, traceMeta): InvocationRequest {
  return {
    FunctionName: `${process.env.LAMBDA_PREFIX}indexes`,
    InvocationType: INVOCATION_EVENT,
    LogType: "Tail",
    Payload: JSON.stringify({
      body: JSON.stringify({
        index: body,
        traceMeta,
      }),
    }),
  };
}

export default function invokePutIndex(body: IIndex, traceMeta) {
  const params = getInvokeUpdateParams(body, traceMeta);
  return lambda.invoke(params).promise();
}
