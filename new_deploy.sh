#!/bin/bash

BLUE_SERVICE="blue"
GREEN_SERVICE="green"

if docker ps --format"{{.Names}}" | grep -q "$BLUE_SERVICE"; then
    ACTIVE_SERVICE=$BLUE_SERVICE
    INACTIVE_SERVICE=$GREEN_SERVICE
elif docker ps --format"{{.Names}}" | grep -q "$GREEN_SERVICE"; then
    ACTIVE_SERVICE=$GREEN_SERVICE
    INACTIVE_SERVICE=$BLUE_SERVICE
else
    ACTIVE_SERVICE=$GREEN_SERVICE
    INACTIVE_SERVICE=$BLUE_SERVICE
fi

# startup new env
sudo docker compose -f ./$INACTIVE_SERVICE-compose.yml pull && sudo docker compose -f ./$INACTIVE_SERVICE-compose.yml up -d

# copy correct nginx config
cp $INACTIVE_SERVICE.conf nginx.conf

# reconfigure nginx
sudo docker exec nginx nginx -s reload

# shutdown old env
sudo docker compose -f ./$ACTIVE_SERVICE-compose.yml down
