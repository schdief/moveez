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

# start moveez
CMD [ "npm", "start" ]

# Use the official Go image
FROM golang:1.20

# Set the working directory
WORKDIR /app

# Copy the Go source code
COPY . .

# Install dependencies
RUN go get -u github.com/PuerkitoBio/goquery

# Expose the port
EXPOSE 80

# Command to run the application
CMD ["go", "run", "ketchup.go"]

