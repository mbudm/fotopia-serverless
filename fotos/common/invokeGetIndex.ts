import {
  InvocationRequest,
  InvocationResponse,
} from "aws-sdk/clients/lambda";
import { JSONParseError } from "../errors/jsonParse";
import { INVOCATION_REQUEST_RESPONSE } from "../lib/constants";
import lambda from "../lib/lambda";
import {
  IIndex, ITraceMeta,
} from "../types";

export function getInvokeGetIndexParams(ctx: ITraceMeta): InvocationRequest {
  return {
    ClientContext: JSON.stringify({ custom: ctx}),
    FunctionName: `${process.env.LAMBDA_PREFIX}indexes`,
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    LogType: "Tail",
  };
}

export default function invokeGetIndex(ctx: ITraceMeta) {
  const params = getInvokeGetIndexParams(ctx);
  return lambda.invoke(params).promise()
    .then((invocationResponse: InvocationResponse) => {
      try {
        const payload = JSON.parse(invocationResponse.Payload as string);
        const peopleObject: IIndex = typeof payload === "object" ? JSON.parse(payload.body) : { tags: {}, people: {} };
        return peopleObject;
      } catch (e) {
        // tslint:disable-next-line:max-line-length
        throw new JSONParseError(e, `invokeGetIndex invocationResponse is : ${JSON.stringify(invocationResponse)}`);
      }
    })
    .catch((e) => {
      throw new JSONParseError(e, "invokeGetIndex");
    });
}
