# todo - db migration
sls invoke -f collectionDelete -s alpha
sls remove -s alpha
cd ./logging
sls remove -s alpha
cd ../
