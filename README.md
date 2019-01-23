# About
Moveez is a service to keep track of the movies you would like to watch in future. It shows you the ratings from sites like iMDB and Rottentomato and learns from your watching habbits. It even alerts you when a movie is running in cinema or is available on a VoD-plattform of your choice. Furthermore you can browse your list by ratings, release date or genre.

Future updates might include an own score calculated by the individual ratings of all moveez-users.

Visit us at http://moveez.de

![Screenshot](https://github.com/schdief/moveez/blob/master/screenshot.png)

# Development
* `npm install` to install dependencies
* `npm run dev` to start app locally
* `npm test` to run integration tests locally
* `npm run cy:open` to open cypress.io to manage acceptance tests

# Stack
An Express.js app based on Node.js with MongoDB (mlab) - in short MEN.

## Jenkins
We use Jenkins as our CI server with a Docker outside of Docker (DooD) approach, where Jenkins runs inside a container and uses the docker hosts docker daemon.
It is hosted at Hetzner Cloud based on CentOS 7 and can be visited here:
http://moveez.de:8080/job/moveez/

### Docker
[Docker-Setup](https://docs.docker.com/install/linux/docker-ce/centos/#install-using-the-repository)
```
sudo yum install -y yum-utils \
  device-mapper-persistent-data \
  lvm2

sudo yum-config-manager \
    --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo

sudo yum install docker-ce
```
[Docker Post-Install](https://docs.docker.com/install/linux/linux-postinstall/)

`sudo systemctl enable docker`

### Image
Build Jenkins with the following Dockerfile, but change the gid (here 994), to what it is on your docker host - find out with `getent group | grep "docker"`.
```
FROM jenkins/jenkins:lts
LABEL maintainer "schdief.law@gmail.com"
USER root
RUN apt-get update && apt-get install g++ build-essential -y && \
apt-get -y install apt-transport-https \
     ca-certificates \
     curl \
     gnupg2 \
     software-properties-common && \
curl -fsSL https://download.docker.com/linux/$(. /etc/os-release; echo "$ID")/gpg > /tmp/dkey; apt-key add /tmp/dkey$
add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/$(. /etc/os-release; echo "$ID") \
   $(lsb_release -cs) \
   stable" && \
apt-get update && \
apt-get -y install docker-ce
RUN /usr/local/bin/install-plugins.sh docker-slaves workflow-aggregator:latest
RUN /usr/local/bin/install-plugins.sh docker-slaves blueocean:latest
RUN /usr/local/bin/install-plugins.sh docker-slaves pipeline-utility-steps:latest
RUN /usr/local/bin/install-plugins.sh docker-slaves http_request:latest
RUN /usr/local/bin/install-plugins.sh docker-slaves nodejs:latest
RUN /usr/local/bin/install-plugins.sh docker-slaves sonar:latest
RUN /usr/local/bin/install-plugins.sh docker-slaves mailer:latest
RUN /usr/local/bin/install-plugins.sh docker-slaves ssh-slaves:latest
RUN /usr/local/bin/install-plugins.sh docker-slaves pipeline-stage-view:latest
RUN /usr/local/bin/install-plugins.sh docker-slaves pipeline-github-lib:latest
RUN /usr/local/bin/install-plugins.sh docker-slaves github-branch-source:latest
RUN /usr/local/bin/install-plugins.sh docker-slaves github:latest
RUN /usr/local/bin/install-plugins.sh docker-slaves git:latest
RUN /usr/local/bin/install-plugins.sh docker-slaves timestamper:latest
RUN /usr/local/bin/install-plugins.sh docker-slaves credentials-binding:latest
RUN /usr/local/bin/install-plugins.sh docker-slaves greenballs:latest
RUN groupadd -g 994 docker-host
RUN usermod -a -G docker-host jenkins
USER jenkins

# add healtcheck for auto-repair
HEALTHCHECK --interval=2m --timeout=10s --retries=3 CMD curl --silent --fail localhost:8080 || exit 1
```

Start the build with: `docker build -t schdief/jenkins .`

Run jenkins in background

```
sudo docker run -d --name jenkins -p 8080:8080 -p 50000:50000 -v /var/run/docker.sock:/var/run/docker.sock -v jenkins_home:/var/jenkins_home schdief/jenkins
```

### Jenkins-Config
#### Plugins
The pipeline requires the following configuration in Jenkins:
- https://wiki.jenkins.io/display/JENKINS/Pipeline+Utility+Steps+Plugin
- https://plugins.jenkins.io/timestamper
- https://wiki.jenkins.io/display/JENKINS/HTTP+Request+Plugin
- https://wiki.jenkins.io/display/JENKINS/NodeJS+Plugin
	+ add a nodejs installation in jenkins tool config named "node" (version 10.4 is needed)
- https://plugins.jenkins.io/sonar
	+ add SonarQube Scanner installation in jenkins tool config named "sonarqube"
	+ add a sonarqube server to manage jenkins named "sonarcloud"
- https://wiki.jenkins.io/display/JENKINS/Azure+App+Service+Plugin
	+ add microsoft azure service principal credentials named "azure", howto: https://docs.microsoft.com/en-us/cli/azure/create-an-azure-service-principal-azure-cli?view=azure-cli-latest
	+ create azure app service instance: https://docs.microsoft.com/en-us/azure/app-service/containers/quickstart-custom-docker-image
	+ add a deployment slot "test" for testing

#### Credentials
You need to define some credentials for the pipeline to work:
- For github named `github` (ideally via Blue Ocean "add pipeline").
- Furthermore you need to define credentials for dockerhub named `dockerhub`.
- For the production database access named `moveez_db_prod`.

## Database
As already stated we are using MongoDB as our database. Our test databases are running on mlabs.com, our production database runs locally with docker.

### Production
#### Setup
It is accessed via user-defined networking, defined with `docker network create -d bridge moveez_net`

To start the production database use the following command and use different credentials:
```
sudo docker run -e MONGO_INITDB_DATABASE=moveez_db_prod -e MONGO_INITDB_ROOT_USERNAME=SECRET -e MONGO_INITDB_ROOT_PASSWORD=SECRET --network=moveez_net --name mongodb --restart unless-stopped -d -p 27017:27017 -v mongodbdata:/data/db schdieflaw/mongo --smallfiles --auth
```

Initially create the database and the user for the application to access it with, but use different credentials:
```
mongo --host mongodb://secret:secret@localhost:27017
use moveez_db_prod
db.createUser({ user: "moveez", pwd: "secret", roles: [{ role: "readWrite", db: "moveez_db_prod" }]})
exit
```

#### Image
To enable healtchecks we need our own docker image with the following Dockerfile:
```
FROM mongo
LABEL maintainer="schdief.law@gmail.com"
# add healtcheck for auto-repair
HEALTHCHECK --interval=2m --timeout=10s --retries=3 CMD mongo --quiet --eval 'quit(db.runCommand({ ping: 1 }).ok ? 0 : 2)' || exit 1
```

#### Backup
The database is backed up via a cron job on our docker host. The crontab `crontab -e or -l` looks like this:
```
0 * * * * /bin/bash /bin/moveez_db_backup.sh >> /var/log/moveez_db_backup.log 2>&1
```

The script looks like this:
```
#!/bin/bash
backup_name=backup_`date +%Y-%m-%d-%H:%M:%S`.gz
docker exec mongodb mongodump --archive=/data/db/$backup_name --gzip --username SECRET --password SECRET
/root/.local/bin/aws s3 cp /var/lib/docker/volumes/mongodbdata/_data/$backup_name s3://moveez-prod-db-backup/
rm $backup_name -f
```

For this to work you need to install the aws cli first:
```
sudo yum -y install epel-release
sudo yum -y install python-pip
pip install awscli --upgrade --user
PATH=$PATH:~/.local/bin
aws configure
AWS Access Key ID [None]: KEY
AWS Secret Access Key [None]: SECRET
Default region name [None]: eu-central-1
Default output format [None]: json
```

Backups are marked for deletion after 10 days and deleted 1 day later as described [here](https://www.joe0.com/2017/05/24/amazon-s3-how-to-delete-files-older-than-x-days/).

#### Recovery
The recovery is done by:
```
cd /var/lib/docker/volumes/mongodbdata/_data
aws s3 cp s3://moveez-prod-db-backup/backup_2019-01-21-16:00:01.gz backup_2019-01-21-16:00:01.gz
sudo docker exec -it mongodb /bin/bash
mongorestore --archive=backup_2019-01-21-16:00:01.gz --gzip --username SECRET --password SECRET --stopOnError --verbose --drop --dryRun
mongorestore --archive=backup_2019-01-21-16:00:01.gz --gzip --username SECRET --password SECRET --stopOnError --verbose --drop
```

## Graylog
To monitor the stack and user experience we are planning to use graylog.

## Setup
Elasticsearch needs the following configuration to run `sudo sysctl -w vm.max_map_count=262144`. Then start with `docker-compose up -d:
```
version: '2'
services:
  # MongoDB: https://hub.docker.com/_/mongo/
  mongodb:
    image: mongo:3
  # Elasticsearch: https://www.elastic.co/guide/en/elasticsearch/reference/5.6/docker.html
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:5.6.12
    environment:
      - http.host=0.0.0.0
      - transport.host=localhost
      - network.host=0.0.0.0
      # Disable X-Pack security: https://www.elastic.co/guide/en/elasticsearch/reference/5.6/security-settings.html#general-security-settings
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    mem_limit: 1g
  # Graylog: https://hub.docker.com/r/graylog/graylog/
  graylog:
    image: graylog/graylog:3.0
    environment:
      # CHANGE ME!
      - GRAYLOG_PASSWORD_SECRET=somepasswordpepper
      # Password: admin
      - GRAYLOG_ROOT_PASSWORD_SHA2=8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
      - GRAYLOG_WEB_ENDPOINT_URI=http://0.0.0.0:9000/api
    links:
      - mongodb:mongo
      - elasticsearch
    depends_on:
      - mongodb
      - elasticsearch
    ports:
      # Graylog web interface and REST API
      - 9000:9000
      # Syslog TCP
      - 514:514
      # Syslog UDP
      - 514:514/udp
      # GELF TCP
      - 12201:12201
      # GELF UDP
      - 12201:12201/udp
```

# Run

Most things are controlled via docker. To get an overview of the health of the services just run `docker ps`.

| Service | Restart | Logs |
| ------- | ------- | ---- |
| app     |`docker restart moveez_prod` | `docker restart moveez_prod`
| db      |`docker restart mongodb` | `docker restart mongodb`
| backup  | - | `cat /var/log/moveez_db_backup.log`
