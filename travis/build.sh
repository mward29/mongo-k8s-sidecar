#!/bin/bash

source ~/environment.sh

buildDocker(){
  echo "****************************************************************************"
  echo "***************** Building Docker Image ${FULL_IMAGE} **********************"
  echo "****************************************************************************"

  docker build --no-cache -f  ${TRAVIS_BUILD_DIR}/Dockerfile -t $FULL_IMAGE .

  echo "****************************************************************************"
  echo "***************** Pushing Docker Image ${FULL_IMAGE} ***********************"
  echo "****************************************************************************"

  docker push "${REPO}"
}

REPO=pearsontechnology/mongo-sidecar

docker login -u="$DOCKER_USERNAME" -p="$DOCKER_PASSWORD"

if [[ $TRAVIS_BRANCH == *"master"* ]]; then

  FULL_IMAGE="${REPO}:${releaseVersion}"
  buildDocker

elif [ $TRAVIS_PULL_REQUEST != "false" ]; then

  FULL_IMAGE="${REPO}:${TRAVIS_PULL_REQUEST_BRANCH}"
  buildDocker

else

  FULL_IMAGE="${REPO}:${TRAVIS_BRANCH}"
  buildDocker

fi
