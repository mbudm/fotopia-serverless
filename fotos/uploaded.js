
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
  // get image config
  // do amazon rekognition
  // invoke create
  */
}

/*
s3rver response - compare to what might come out of cognito auth'd remote:
https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-user-identity.html

//local
{
   "Records":[
      {
         "eventVersion":"2.0",
         "eventSource":"aws:s3",
         "awsRegion":"us-east-1",
         "eventTime":null,
         "eventName":"ObjectCreated:Put",
         "usernameentity":{
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

//prod:
START RequestId: dba963bf-2f15-11e8-8276-b957ab2966ac Version: $LATEST
2018-03-24 14:45:56.515 (+11:00)        dba963bf-2f15-11e8-8276-b957ab2966ac    uploaded triggered {
  "event": {
    "Records": [
      {
        "eventVersion": "2.0",
        "eventSource": "aws:s3",
        "awsRegion": "us-east-1",
        "eventTime": "2018-03-24T03:45:56.043Z",
        "eventName": "ObjectCreated:Put",
        "usernameentity": {
          "principalId": "AWS:AROAJLYCABBFD7YZWEFHY:CognitoIdentityCredentials"
        },
        "requestParameters": {
          "sourceIPAddress": "180.150.31.251"
        },
        "responseElements": {
          "x-amz-request-id": "0F4C5ED1B8FD0C07",
          "x-amz-id-2": "00eI8JNfGUBPZZRtQ8ikL5JC..."
        },
        "s3": {
          "s3SchemaVersion": "1.0",
          "configurationId": "b477ee43-f8a3-48db-8ef9-753009f76351",
          "bucket": {
            "name": "fotopia-web-app-prod",
            "ownerIdentity": {
              "principalId": "AVA4PR7F8OFAJ"
            },
            "arn": "arn:aws:s3:::fotopia-web-app-prod"
          },
          "object": {
            "key": "OrenMikiSteve.JPG",
            "size": 162253,
            "eTag": "40299fd62f25ecf530ef6e6b8401a52e",
            "sequencer": "005AB5C9F3E9BFD649"
          }
        }
      }
    ]
  },
  "context": {
    "callbackWaitsForEmptyEventLoop": true,
    "logGroupName": "/aws/lambda/fotopia-web-app-prod-uploaded",
    "logStreamName": "2018/03/24/[$LATEST]78b476ad75b549389a1edbf608845c00",
    "functionName": "fotopia-web-app-prod-uploaded",
    "memoryLimitInMB": "1024",
    "functionVersion": "$LATEST",
    "invokeid": "dba963bf-2f15-11e8-8276-b957ab2966ac",
    "awsRequestId": "dba963bf-2f15-11e8-8276-b957ab2966ac",
    "invokedFunctionArn": "arn:aws:lambda:us-east-1:366399188066:
        function:fotopia-web-app-prod-uploaded"
  }
}

*/
