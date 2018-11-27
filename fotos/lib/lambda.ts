import * as AWS from "aws-sdk";
import {
  InvocationResponse,
} from "aws-sdk/clients/lambda";

let lambda = {
  invoke: (invokeParams) => ({
    promise: (): Promise<InvocationResponse> => new Promise((res) => res({})),
  }),
};
// connect to local lamda if running offline
if (process.env.IS_OFFLINE) {
  const handlerFuncsMap = {
    faces: "addToPerson",
    get: "getItem",
    query: "queryItems",
    stream: "indexRecords",
    thumbs: "createThumb",
    update: "updateItem",
  };
  /*
    If the app is offline then lamda.invoke requires the handler
    function and maps the invoke parameters to the lambda signature
    this is very specific to lamdas in this project, as it needs to determine
    the handler function name and assume how the lamda expects its request parameters.
    Perhaps the serverless yml config could be used to provide this info, or some config
    specific to this helper could be provided
  */
  const getHandlerFn = (handlerObj, handlerFunctionName) => {
    const fnKeys = Object.keys(handlerObj).filter((key) => typeof handlerObj[key] === "function");
    // assumes the first fn is the handler if not spec'd in the map
    const fnKey = handlerFuncsMap[handlerFunctionName] || fnKeys[0];
    return handlerObj[fnKey];
  };

  lambda = {
    invoke: (invokeParams) => {
      const handler = require(`../${invokeParams.FunctionName}`);
      const handlerFn = getHandlerFn(handler, invokeParams.FunctionName);
      return {
        promise: (): Promise<InvocationResponse> => new Promise((resolve, reject) => {
          // tslint:disable-next-line:no-console
          console.log("---- lambda invoke ----", invokeParams.FunctionName);
          handlerFn(
            JSON.parse(invokeParams.Payload), // assumes fn expects request params here
            null,
            (context, response) => {
              const serialized = {
                Payload: JSON.stringify(response),
              };
              if (response.statusCode !== 200) {
                reject(serialized);
              } else {
                resolve(serialized);
              }
            },
          );
        }),
      };
    },
  };
} else {
  lambda = new AWS.Lambda();
}
export default lambda;
