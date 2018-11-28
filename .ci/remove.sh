# todo - db migration
sls remove -s dev
sls remove -s prod
cd ./logging
sh serverless.env.sh
sls remove -s dev
sls remove -s prod
cd ../
