[![Build Status](https://travis-ci.org/mbudm/fotopia-serverless.svg?branch=master)](https://travis-ci.org/mbudm/fotopia-serverless)
# fotopia-serverless
A photo archive using serverless framework

## Requires
- Node 6.x or later
- yarn (or npm)
- serverless framework `yarn global add serverless`
- serverless platform account
- AWS account with credentials (https://serverless.com/framework/docs/providers/aws/guide/credentials/)

## Local development

### Env vars
- create a `.env` file with vars that serverless.yml expects. These aren't needed for offline use but need to be defined. See CI section below for more info.
```sh
CUSTOM_DOMAIN_DEV=dev-api.yourdomain.com
CUSTOM_DOMAIN_PROD=api.yourdomain.com
```
- Then do `sh serverless.env.sh` to create the expected `serverless.env.yml` file.

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

- remove s3 'bucket', not crucial just avoids the CLI message: `error: [S3rver] Error creating bucket. Bucket "fotopia-web-app-prod" already exists`. To avoid this do these two remove cmds
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
FOTOPIA_GROUP=my-group # a string used as dynamodb global index key to allow queries across all users photos. in future this will allow for a simple way to have separate groups in one fotopia instance
```

If you are setting up a test user for a new stack or a new user each time then, remove `TEST_EXISTING_USER` and use:
```sh
TEST_USER_EMAIL=test-user@yourdomain.com.com
TEST_USER_NAME=YourTestUserName
TEST_USER_TEMP_PWD=TempPwd123!
TEST_USER_PWD=PermPwd456!
```
