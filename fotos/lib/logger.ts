import * as bunyan from "bunyan";

const log = bunyan.createLogger({ name: "fotopia" });

export function parseError(err) {
  const errorFields = {
    errorCode: "",
    errorMessage: "",
    errorRaw: err,
  };
  if (err && err.code) {
    errorFields.errorCode = err.code;
  }
  if (err && err.message) {
    errorFields.errorMessage = err.message;
  }
  if (err && err.isJoi) {
    errorFields.errorCode = `Joi:${err.name}`;
  }
  if (err && Object.keys(err).length === 0) {
    errorFields.errorCode = "EmptyErrorObject";
  }
  if (!err) {
    errorFields.errorCode = "ErrorUndefinedOrNull";
  }
  return errorFields;
}

export default function logger(context, startTime, fields = {}) {
  let logObj = {
    errorCode: "",
    errorMessage: "",
    errorRaw: new Error(),
    functionName: "",
    functionVersion: "",
    latencyMs: Date.now() - startTime,
    requestId: "",
  };
  if (fields && Object.keys(fields)) {
    Object.keys(fields).forEach((field) => {
      switch (field) {
        case "err":
          logObj = { ...logObj, ...parseError(fields[field]) };
          break;
        default:
          logObj[field] = fields[field];
          break;
      }
    });
  }

  if (process.env.IS_OFFLINE) {
    logObj = {
      ...context,
      ...logObj,
    };
  } else {
    logObj = {
      functionName: context.functionName,
      functionVersion: context.functionVersion,
      requestId: context.awsRequestId,
      ...logObj,
    };
  }

  log.info(logObj);
}
