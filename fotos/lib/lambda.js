import AWS from 'aws-sdk';

let lambda = {};
// connect to local lamda if running offline
if (process.env.IS_OFFLINE) {
  /*
    If the app is offline then lamda.invoke requires the handler
    function and maps the invoke parameters to the lambda signature
    this is very specific to lamdas in this project, as it needs to determine
    the handler function name and assume how the lamda expects its request parameters.
    Perhaps the serverless yml config could be used to provide this info, or some config
    specific to this helper could be provided
  */
  const getHandlerFn = (handlerObj) => {
    const fnKeys = Object.keys(handlerObj).filter(key=> typeof handlerObj[key] === 'function');
    return handlerObj[fnKeys[0]]; //assumes the first fn is the handler
  };

  lambda = {
    invoke: (invokeParams) => {
      const handler = require(`../${invokeParams.FunctionName}`);
      const handlerFn = getHandlerFn(handler);
      return {
        promise: () => {
          return new Promise((resolve, reject) => {
            handlerFn(JSON.parse(invokeParams.Payload), //assumes fn expects request params here
            null,
            (context, response) => {
              if(response.statusCode !== 200){
                reject(response);
              }else{
                resolve(response);
              }
            });
          });
        }
      };
    }
  }
} else{
  lambda = new AWS.Lambda();
}
export default lambda;
