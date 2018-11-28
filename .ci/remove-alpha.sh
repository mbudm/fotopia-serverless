# todo - db migration
sls remove -s alpha
cd ./logging
sh serverless.env.sh
sls remove -s alpha
cd ../
