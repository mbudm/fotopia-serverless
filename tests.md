curl -X POST -H "Content-Type:application/json" http://localhost:3000/create --data '{ "birthtime":"2012-06-28T00:55:11.000Z","tags":"blue,red"}'

Use post for query to avoid query strings which are not working. Only contains one query parameter in event object(?)

curl -X POST -H "Content-Type:application/json" http://localhost:3000/query --data '{ "tags":"blue,red", "from":"2004-04-04", "to":"2017-11-02"}'


aws dynamodb list-tables --endpoint-url http://localhost:8000
More: http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Tools.CLI.html


## AWS CLI - helpful cmds

aws dynamodb put-item --table-name fotopia-web-app-dev --item file:///Users/steve/dev/fotopia/fotopia-web-app/awscli/put.json --endpoint-url http://localhost:8000

aws dynamodb describe-table --table-name fotopia-web-app-dev --endpoint-url http://localhost:8000
