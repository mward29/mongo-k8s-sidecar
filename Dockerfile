FROM node:alpine
MAINTAINER Benjamin Somogyi <benjamin.somogyi@pearson.com>

WORKDIR /opt/mongo/mongo-k8s-sidecar

COPY package.json /opt/mongo/mongo-k8s-sidecar/package.json

RUN npm install

COPY /src /opt/mongo/mongo-k8s-sidecar/src
COPY .foreverignore /opt/mongo/.foreverignore

CMD ["npm", "start"]
