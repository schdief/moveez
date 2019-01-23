FROM node
LABEL maintainer="schdief.law@gmail.com"

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
RUN mv ./dist/app ./app

EXPOSE 443

# add healtcheck for auto-repair
HEALTHCHECK --interval=5m --timeout=10s --retries=5 CMD curl --silent --fail localhost:443 || exit 1

# start moveez
CMD [ "npm", "start" ]