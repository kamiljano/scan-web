#! /bin/bash

set -e

pulumi login --local
docker-compose up -d db
minikube config set driver docker
minikube delete
minikube start