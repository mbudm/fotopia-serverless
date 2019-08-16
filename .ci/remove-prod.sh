# todo - db migration
sls invoke -f collectionDelete -s prod
sls remove -s prod
cd ./logging
sls remove -s prod
cd ../
