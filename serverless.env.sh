#!/bin/sh

FILE="serverless.env.yml"

echo "dev:" > $FILE
echo "  CUSTOM_DOMAIN: $CUSTOM_DOMAIN_DEV" >> $FILE
echo "  CERTIFICATE_NAME: $CERTIFICATE_NAME_DEV" >> $FILE
echo "prod:" >> $FILE
echo "  CUSTOM_DOMAIN: $CUSTOM_DOMAIN_PROD" >> $FILE
echo "  CERTIFICATE_NAME: $CERTIFICATE_NAME_PROD" >> $FILE
