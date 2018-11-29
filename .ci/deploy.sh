yarn lint
sls dynamodb install
sls offline start --exec "yarn functional-local"
sls deploy -s dev
sls s3sync -s dev
cd ./logging
sls deploy -s dev
cd ../
yarn functional-dev
