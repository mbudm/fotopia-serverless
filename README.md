# fotopia-serverless
A photo archive using serverless framework

## Requires
- Node 6.x or later
- yarn (or npm)
- serverless framework `yarn global add serverless`
- AWS account with credentials (https://serverless.com/framework/docs/providers/aws/guide/credentials/)

## Set up
- `yarn`
- `sls dynamodb install`

## Deploy locally and run functional test 
- `sls offline start`
- `yarn functional`

Local cleanup 
- remove s3 'bucket', not crucial just avoids the CLI message: 'error: [S3rver] Error creating bucket. Bucket "fotopia-web-app-prod" already exists'
`rm -R /tmp/s3Bucket/fotopia-web-app-prod/`
`rm -R /tmp/s3Bucket/fotopia-web-app-prod-client/`

You may also need to 
- kill node server `killall node` (warning: kills all node scripts)
- kill dynamodb local `lsof -i:8000` then `kill [PID]`


## Deploy in AWS, run functional test and remove
- `sls deploy`
- `hostname=https://[your-stack-id-here].execute-api.us-east-1.amazonaws.com/prod/ yarn functional`
- `sls remove`
