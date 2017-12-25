# fotopia-serverless
A photo archive using serverless framework

## Requires
Node 6.x or later
serverless framework

## Set up
`npm i`
`sls dynamodb install`

## Run offline locally
`sls offline start`
`npm run functional`

Local cleanup 
- remove s3 'bucket', not crucial just avoids the message:
'error: [S3rver] Error creating bucket. Bucket "fotopia-web-app-prod" already exists'
`rm -R /tmp/s3Bucket/fotopia-web-app-prod/`

You may also need to 
- kill node server `killall node` (warning: kills all node scripts)
- kill dynamodb local `lsof -i:8000` then `kill [PID]`


## Run in AWS, test and remove
`sls deploy`
`hostname=https://[your-deployed-stack]/prod/ npm run functional`
`sls remove`