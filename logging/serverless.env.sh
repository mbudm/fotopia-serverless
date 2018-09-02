#!/bin/sh

FILE="serverless.env.yml"

export $(egrep -v '^#' .env | xargs)

echo "HONEY_KEY: $HONEY_KEY" > $FILE
echo "LOG_GROUP_PREFIX: $LOG_GROUP_PREFIX" >> $FILE
