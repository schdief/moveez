FROM golang:alpine
LABEL maintainer="schdief.law@gmail.com"
LABEL service="moveezgui"

# making release name available for app to display
ARG RELEASE
ENV RELEASE ${RELEASE}

# working directory for moveez
WORKDIR /usr/src/app

# install dependencies from go.mod
COPY go.mod ./
RUN go mod download

# bundle app source
COPY . .

# build the Go application
RUN go build -o main .

EXPOSE 80

# start moveez
CMD ["./main"]