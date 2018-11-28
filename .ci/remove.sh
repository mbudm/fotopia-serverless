# todo - db migration
sls remove -s dev
sls remove -s prod
cd ./logging
sls remove -s dev
sls remove -s prod
cd ../
