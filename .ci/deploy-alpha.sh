yarn lint
sls dynamodb install
sls offline start --exec "yarn functional-local"
sls deploy -s alpha
sls s3sync -s alpha
cd ./logging
sh serverless.env.sh
sls deploy -s alpha
cd ../
yarn functional-alpha
