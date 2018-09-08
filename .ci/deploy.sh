yarn lint
sls dynamodb install
sls offline start --exec "yarn functional-local"
sls deploy -s dev
sls s3sync
yarn functional-dev
sls deploy -s prod
