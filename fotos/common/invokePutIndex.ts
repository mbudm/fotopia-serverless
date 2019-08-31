import {
  InvocationRequest,
} from "aws-sdk/clients/lambda";
import { INVOCATION_EVENT } from "../lib/constants";
import lambda from "../lib/lambda";
import {
  IIndexUpdate, IPutIndexRequest,
} from "../types";

export function getInvokeUpdateParams(indexUpdate: IIndexUpdate, traceMeta): InvocationRequest {
  const body: IPutIndexRequest = {
    indexUpdate,
    traceMeta,
  };
  return {
    FunctionName: `${process.env.LAMBDA_PREFIX}indexesUpdate`,
    InvocationType: INVOCATION_EVENT,
    LogType: "Tail",
    Payload: JSON.stringify({
      body: JSON.stringify(body),
    }),
  };
}

export default function invokePutIndex(indexUpdate: IIndexUpdate, traceMeta) {
  const params = getInvokeUpdateParams(indexUpdate, traceMeta);
  return lambda.invoke(params).promise();
}
