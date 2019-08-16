# todo - db migration
sls invoke -f collectionDelete -s dev
sls remove -s dev
cd ./logging
sls remove -s dev
cd ../
