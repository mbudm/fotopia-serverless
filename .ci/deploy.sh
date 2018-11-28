yarn lint
sls dynamodb install
sls offline start --exec "yarn functional-local"
sls deploy -s dev
sls s3sync
cd ./logging
sh serverless.env.sh
sls deploy -s dev
cd ../
yarn functional-dev
sls deploy -s prod
cd ./logging
sh serverless.env.sh
sls deploy -s prod
cd ../
