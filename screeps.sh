#!/bin/bash

case $1 in
    up)
        sudo docker-compose up -d
        ;;
    cli)
        sudo docker-compose exec screeps screeps-launcher cli
        ;;
    lint)
        sudo docker-compose exec $2 dev npm run lint
        ;;
    test)
        sudo docker-compose exec $2 dev npm run test
        ;;
    *)
        sudo docker-compose "$@"
        ;;
esac