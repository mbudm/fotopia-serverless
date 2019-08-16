yarn lint
yarn test
sls deploy -s dev
sls s3sync -s dev
cd ./logging
sls deploy -s dev
cd ../
yarn functional-dev
