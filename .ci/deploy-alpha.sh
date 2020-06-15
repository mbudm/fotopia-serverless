yarn lint
yarn test
sls deploy -s alpha
cd ./logging
sls deploy -s alpha
cd ../
yarn functional-alpha
