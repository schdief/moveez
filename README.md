# About
[![Build Status Gui](https://dev.azure.com/Schdieflaw0018/moveez/_apis/build/status/gui?branchName=master)](https://dev.azure.com/Schdieflaw0018/moveez/_build/latest?definitionId=15&branchName=master)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=schdief%3Amoveez-gui&metric=alert_status)](https://sonarcloud.io/dashboard?id=schdief%3Amoveez-gui)

`Moveez` is a service to keep track of the movies you would like to watch in future. It shows you the ratings from sites like iMDB.com and Rottentomatoes.com.

[Visit us at www.moveez.de](https://www.moveez.de)

Future updates might include:
- It even alerts you when a movie is running in cinema or is available on a VoD-plattform of your choice.
- Furthermore you can browse your list by ratings, release date or genre.
- an own score calculated by the individual ratings of all moveez-users.

![Screenshot](https://github.com/schdief/moveez/blob/master/screenshot.jpg)

# CI/CD with Azure DevOps
We have switched from Jenkins to Azure DevOps. You can find the workspace [here](https://dev.azure.com/Schdieflaw0018/moveez/).
Within Azure DevOps we are using Azure Pipelines to build and release moveez. The pipeline configuration is done via `azure-pipeline.yml` per service.

## Code analysis with sonarcloud.io
We use sonarcloud.io for our static code analysis. It is automaticly triggered for all branches as a parallel step to the build. The results are published to Azure DevOps and a [dashboard](https://sonarcloud.io/organizations/schdief-github/projects).

## Linting our code style with prettier.io
We use prettier.io to lint our code style. To prevent manual effort, you can add the prettier to your `.git/hooks`. Just use the following `pre-commit`hook (requires prettier to be installed globally via npm):
```
#!/bin/sh
FILES=$(git diff --cached --name-only --diff-filter=ACM “.js” “.jsx” | sed ‘s| |\\ |g’)
[ -z “$FILES” ] && exit 0
# Prettify all selected files
echo “$FILES” | xargs prettier --write
# Add back the modified/prettified files to staging
echo “$FILES” | xargs git add
exit 0
```

## Regression testing with cypress.io
We use cypress.io to perform our regression testing. It is automaticly triggered for all branches on UAT stage after the deployment. The results are published to Azure DevOps and a [dashboard](https://dashboard.cypress.io/#/projects/dhwwh4/runs).

# Stack/Architecture
This app consists of multiple [microservices](https://github.com/schdief/moveez/tree/master/services), all based on [Express](https://expressjs.com/). Our data is managed by [MongoDB](https://www.mongodb.com) - the setup is described in the [database directory](https://github.com/schdief/moveez/tree/master/infra/database). To run the services and database we are using [Rancher](https://rancher.com), which setup is described [here](https://github.com/schdief/moveez/tree/master/infra/rancher). The deployment of services to Rancher is done via [helm](https://helm.sh). 

# Run
## Initial Setup
1. Set up the [servers and rancher](https://github.com/schdief/moveez/tree/master/infra/rancher)
2. Set up the [network configuration including DNS and TLS](https://github.com/schdief/moveez/tree/master/infra/network)
3. Set up the [databases for UAT and PROD](https://github.com/schdief/moveez/tree/infra/database)
4. Set up the [secret for the facebook login](https://github.com/schdief/moveez/tree/master/services/gui)

## Monitoring
To monitor our services we are using uptime robot that can be visited here:
https://uptimerobot.com/dashboard#mainDashboard

## Logs
Currently you have to look at the container logs e. g. via Rancher, but in future we want to use Graylog or something similar.
