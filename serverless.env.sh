#!/bin/sh

FILE="serverless.env.yml"

export $(egrep -v '^#' .env | xargs)

echo "dev:" > $FILE
echo "  CUSTOM_DOMAIN: $CUSTOM_DOMAIN_DEV" >> $FILE
echo "prod:" >> $FILE
echo "  CUSTOM_DOMAIN: $CUSTOM_DOMAIN_PROD" >> $FILE
echo "FOTOPIA_GROUP: $FOTOPIA_GROUP" >> $FILE
