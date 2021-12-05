#!/bin/bash

case $1 in
    up)
        sudo docker-compose up -d
        ;;
    cli)
        sudo docker-compose exec screeps screeps-launcher cli
        ;;
    test)
        sudo docker-compose exec dev npm run test
        ;;
    *)
        sudo docker-compose "$@"
        ;;
esac