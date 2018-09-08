# logging stack uses arns which change with a remove and deploy, so we need to also remove and deploy logging
cd ./logging
sh serverless.env.sh
sls remove
sls deploy
cd ../
