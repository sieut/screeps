#!/bin/bash

case $1 in
    up)
        docker-compose up -d
        ;;
    cli)
        docker-compose exec screeps screeps-launcher cli
        ;;
    lint)
        docker-compose exec $2 dev npm run lint
        ;;
    prettier)
        docker-compose exec $2 dev npm run prettier
        ;;
    test)
        docker-compose exec $2 dev npm run test
        ;;
    *)
        docker-compose "$@"
        ;;
esac