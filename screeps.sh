#!/bin/bash

case $1 in
    up)
        sudo docker-compose up -d
        ;;
    cli)
        sudo docker-compose exec screeps screeps-launcher cli
        ;;
    *)
        sudo docker-compose $1
        ;;
esac