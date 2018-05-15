# fotopia-serverless
A photo archive using serverless framework

## Requires
- Node 6.x or later
- yarn (or npm)
- serverless framework `yarn global add serverless`
- serverless platform account
- AWS account with credentials (https://serverless.com/framework/docs/providers/aws/guide/credentials/)

## Local development

### Run locally
- `sls login` (log in to serverless platform account -  optional)
- `yarn`
- `yarn lint`
- `yarn test` - unit tests
- `sls dynamodb install`
- `sls offline start`
- `yarn functional-local` to run functional (api) tests against local

### Local cleanup 
Serverless offline is a mock environment, which sometimes needs a bit of cleaning up.

- remove s3 'bucket', not crucial just avoids the CLI message: `error: [S3rver] Error creating bucket. Bucket "fotopia-web-app-prod" already exists`
`rm -R /tmp/s3Bucket/fotopia-web-app-prod/ && rm -R /tmp/s3Bucket/fotopia-web-app-prod-client/`
- kill node server `killall node` (warning: kills all node scripts)
- kill dynamodb local `lsof -i:8000` then `kill [PID]`
- - or use [kill-port](https://www.npmjs.com/package/kill-port) npm package to simply do `kill-port 8000` (recommended)

## CI/CD
The `.travis.yml` file does the following steps on commit:

- `sh serverless.env.sh` create env vars for serverless.yml
- `yarn lint`
- `npm install -g serverless`
- `sls dynamodb install`
- `sls offline start --exec "yarn functional-local"` Run functional tests against an offline stack
- `sls deploy -s dev` Deploy to dev stage environment
- `yarn functional-dev` Run functional tests against the dev stage stack
- `sls deploy -s prod` Deploy to prod stage environment

### Required environmnet vars
```sh
AWS_ACCESS_KEY_ID=<aws access key>
AWS_SECRET_ACCESS_KEY=<aws secret key> 
BUCKET_PREFIX=your-s3-bucket-name-before-stage-is-added # eg my-bucket- which becomes my-bucket-prod 
CUSTOM_DOMAIN_DEV=dev-api.yourdomain.com
CUSTOM_DOMAIN_PROD=api.yourdomain.com
TEST_EXISTING_USER=YourTestUserName
TEST_EXISTING_USER_PWD=Y0urTestP*ssword
```

If you are setting up a test user for anew stack or a new user each time then, remove `TEST_EXISTING_USER` and use:
```
TEST_USER_EMAIL=test-user@yourdomain.com.com
TEST_USER_NAME=YourTestUserName
TEST_USER_TEMP_PWD=TempPwd123!
TEST_USER_PWD=PermPwd456!
```
