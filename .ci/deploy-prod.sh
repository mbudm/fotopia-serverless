sls deploy -s prod
sls s3sync -s prod
cd ./logging
sls deploy -s prod
cd ../
