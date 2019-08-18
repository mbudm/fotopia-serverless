import { ILoggerBaseParams, ITraceMeta } from "../types";
export function getTraceMeta(loggerBaseParams: ILoggerBaseParams): ITraceMeta {
  return {
    parentId: loggerBaseParams.id,
    traceId: loggerBaseParams.traceId,
  };
}
