
export function logger(msg) {
  console.log('uploaded triggered', msg);
}

export async function uploadedItem(event, context) {
  logger(JSON.stringify({
    event,
    context,
  }, null, 2));

  /*
  call config
  call cognito
  get user id

  */
}

/*
s3rver response - compare to what might come out of cognito auth'd remote:
https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-user-identity.html
{
   "Records":[
      {
         "eventVersion":"2.0",
         "eventSource":"aws:s3",
         "awsRegion":"us-east-1",
         "eventTime":null,
         "eventName":"ObjectCreated:Put",
         "userIdentity":{
            "principalId":"AWS:9DA289650539D950A8F22"
         },
         "requestParameters":{
            "sourceIPAddress":"127.0.0.1"
         },
         "responseElements":{
            "x-amz-request-id":"84BADAC99D9C50FA",
            "x-amz-id-2":"oisKQwJJSJzceFFbJY7fgLdy8/6KoBedn+iNg0XHpuw="
         },
         "s3":{
            "s3SchemaVersion":"1.0",
            "configurationId":"testConfigId",
            "bucket":{
               "name":"fotopia-web-app-prod",
               "ownerIdentity":{
                  "principalId":"37B0E3B9C3085C"
               },
               "arn":"arn:aws:s3:: :fotopia-web-app-prod"
            },
            "object":{
               "key":"16 (1).JPG",
               "sequencer":"1623D605F51",
               "size":88903,
               "eTag":"a7e7d65c7286a02ae232ca453ca5c46e"
            }
         }
      }
   ]
}

*/
