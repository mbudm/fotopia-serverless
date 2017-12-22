import AWS from 'aws-sdk';

let lambda = {};
// connect to local lamda if running offline
if (process.env.IS_OFFLINE) {

  // need to require function like:
  // https://github.com/dherault/serverless-offline/issues/220

  lambda = {
    invoke: (invokeParams) => {
      const handler = require(`../${invokeParams.FunctionName}`);
      return {
        promise: () => {
          return new Promise((resolve, reject) => {
            handler.getItem({ // need to know fn name, search Object.keys() ?
              pathParameters: JSON.parse(invokeParams.Payload)
            }, null, (context, response) => {
              console.log('aloha!', response.statusCode);
              if(response.statusCode !== 200){
                reject(response.body);
              }else{
                resolve(response.body);
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
