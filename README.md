# fotopia-serverless
A photo archive using serverless framework

## Requires
- Node 6.x or later
- serverless framework `npm install -g serverless`
- AWS account with credentials (https://serverless.com/framework/docs/providers/aws/guide/credentials/)

## Set up
- `npm i`
- `sls dynamodb install`

## Deploy locally and run functional test 
- `sls offline start`
- `npm run functional`

Local cleanup 
- remove s3 'bucket', not crucial just avoids the CLI message: 'error: [S3rver] Error creating bucket. Bucket "fotopia-web-app-prod" already exists'
`rm -R /tmp/s3Bucket/fotopia-web-app-prod/`

You may also need to 
- kill node server `killall node` (warning: kills all node scripts)
- kill dynamodb local `lsof -i:8000` then `kill [PID]`


## Deploy in AWS, run functional test and remove
`sls deploy`
`hostname=https://[your-stack-id-here].execute-api.us-east-1.amazonaws.com/prod/ npm run functional`
`sls remove`