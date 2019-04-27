FROM node:alpine as test

# install dependencies
COPY package*.json ./
RUN npm install

# bundle app source
COPY . .

# run integration test with mocha
RUN npm test

# TODO: add sonarqube

FROM node:alpine
LABEL maintainer="schdief.law@gmail.com"
LABEL app="ketchup"

# making release name available for app to display
ARG RELEASE
ENV RELEASE ${RELEASE}

# working directory for moveez
WORKDIR /usr/src/app

# install dependencies from package.json, but no dev
COPY package*.json ./
RUN npm install --only=prod

# bundle app source
COPY . .

EXPOSE 80

#install curl for healthcheck
RUN apk --no-cache add curl  

# add healtcheck for auto-repair
HEALTHCHECK --interval=5m --timeout=10s --retries=5 CMD curl --silent --fail localhost:80 || exit 1

# start moveez
CMD [ "npm", "start" ]