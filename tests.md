curl -X POST -H "Content-Type:application/json" http://localhost:3000/create --data '{ "birthtime":"2012-06-28T00:55:11.000Z","tags":"blue,red"}'

curl -H "Content-Type:application/json" http://localhost:3000/fotos/query?tags=blue,red&from=2004-04-04&to=2017-11-02


use post for query to avoid query strings which are not working

curl -X POST -H "Content-Type:application/json" http://localhost:3000/query --data '{ "tags":"blue,red", "from":"2004-04-04", "to":"2017-11-02"}'


aws dynamodb list-tables --endpoint-url http://localhost:8000
More: http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Tools.CLI.html


