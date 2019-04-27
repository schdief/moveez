FROM node:alpine as test

# install dependencies (without cypress)
COPY package*.json ./
RUN npm install --no-optional

# bundle app source
COPY . .

# run integration test with mocha
RUN npm test

# TODO: add sonarqube

FROM node:alpine as build

# TODO: reuse dependencies to speed up build
# install dependencies (without cypress)
COPY package*.json ./
RUN npm install --no-optional

# bundle app source
COPY . .

# build frontend javascript (react)
RUN npm run babel
RUN npm run webpack

FROM node:alpine AS final
LABEL maintainer="schdief.law@gmail.com"
LABEL service="moveezgui"

# making release name available for app to display
ARG RELEASE
ENV RELEASE ${RELEASE}

# working directory for moveez
WORKDIR /usr/src/app

# install dependencies from package.json, but no dev
COPY package*.json ./
RUN npm install --only=prod --no-optional

# bundle app source
# TODO: remove unncessary files like test directory
COPY . .

# get frontend javascript (react) from previos stage
COPY --from=build dist/app app

EXPOSE 80

#install curl for healthcheck
RUN apk --no-cache add curl  

# add healtcheck for auto-repair
HEALTHCHECK --interval=5m --timeout=10s --retries=5 CMD curl --silent --fail localhost:80 || exit 1

# start moveez
CMD [ "npm", "start" ]