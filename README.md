# About
[![Build Status gui](https://dev.azure.com/Schdieflaw0018/moveez/_apis/build/status/gui?branchName=master)](https://dev.azure.com/Schdieflaw0018/moveez/_build/latest?definitionId=2&branchName=master)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=schdief%3Amoveez-gui&metric=alert_status)](https://sonarcloud.io/dashboard?id=schdief%3Amoveez-gui)

`Moveez` is a service to keep track of the movies you would like to watch in future. It shows you the ratings from sites like iMDB.com and Rottentomatoes.com.

[Visit us](https://www.moveez.de)

Future updates might include:
- It even alerts you when a movie is running in cinema or is available on a VoD-plattform of your choice.
- Furthermore you can browse your list by ratings, release date or genre.
- an own score calculated by the individual ratings of all moveez-users.

![Screenshot](https://github.com/schdief/moveez/blob/master/screenshot.jpg)

# CI/CD with Azure DevOps
We have switched from Jenkins to Azure DevOps. You can find the workspace [here](https://dev.azure.com/Schdieflaw0018/moveez/).
Within Azure DevOps we are using Azure Pipelines to build and release moveez.
* The build configuration is done via `azure-build-pipeline.yml` per service.
* The release is currently configured in GUI due to [lack of support of release config files](https://dev.azure.com/mseng/AzureDevOpsRoadmap/_workitems/edit/1364226/). Nevertheless we already store the release config in `azure-release-pipeline.yaml`.

## Code analysis with Sonarcloud.io
We use sonarcloud.io for our static code analysis. It is automaticly triggered for all branches as a parallel step to the build. The results are published to Azure DevOps and a [dashboard](https://sonarcloud.io/organizations/schdief-github/projects).

## Regression testing with Cypress.io
We use cypress.io to perform our regression testing. It is automaticly triggered for all branches on UAT stage after the deployment. The results are published to Azure DevOps and a [dashboard](https://dashboard.cypress.io/#/projects/dhwwh4/runs).

# Stack/Architecture
This app consists of multiple [microservices](https://github.com/schdief/moveez/tree/master/services), all based on [Express](https://expressjs.com/). Our data is managed by [MongoDB](https://www.mongodb.com) - the setup is described in the [database directory](https://github.com/schdief/moveez/tree/master/infra/database). To run the services and database we are using [Rancher](https://rancher.com), which setup is described [here](https://github.com/schdief/moveez/tree/master/infra/rancher). The deployment of services to Rancher is done via [helm](https://helm.sh). 

# Run
## Monitoring
To monitor our services we are using uptime robot that can be visited here:
https://uptimerobot.com/dashboard#mainDashboard

## Logs
Currently you have to look at the AKS logs, but we want to use Azure Logs.