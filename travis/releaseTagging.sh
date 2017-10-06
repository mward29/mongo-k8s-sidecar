#!/bin/bash

source ~/environment.sh

cloneMaster(){
    rm -Rf /tmp/mongo-k8s-sidecar > /dev/null 2>&1
    git clone --depth=50 --branch=master git@github.com:pearsontechnology/mongo-k8s-sidecar.git /tmp/mongo-k8s-sidecar
    cd /tmp/mongo-k8s-sidecar
}

mergeIntoMaster(){
    git remote set-branches --add origin dev
    git fetch
    git merge --no-ff --no-edit origin/dev
}

tagmaster(){
    git tag -d $releaseVersion
    git push origin :refs/tags/$releaseVersion
    git tag -a -m $releaseVersion $releaseVersion
    git push origin master
    git push origin --tags
}


#If it's not a PR, the branch is dev and it is a release, push dev to master and tag master.
if [ $TRAVIS_PULL_REQUEST == "false" ] && [ $TRAVIS_BRANCH == "dev" ] && [ $release == "true" ]; then

        echo "---------------------------------------------------------------------------------------------------------------------------------"
        echo "------------------------  Merge 'dev' to 'master' and Tag Release -----------------------------------------------------------"
        echo "---------------------------------------------------------------------------------------------------------------------------------"

        cloneMaster
        mergeIntoMaster
        tagmaster
fi