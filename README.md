# About
[![Build Status gui](https://dev.azure.com/Schdieflaw0018/moveez/_apis/build/status/gui?branchName=master)](https://dev.azure.com/Schdieflaw0018/moveez/_build/latest?definitionId=2&branchName=master)

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

## Code analysis with SonarCloud
We use sonarcloud.io for our static code analysis. It is automaticly triggered for all branches as a parallel step to the build. The results are published to Azure DevOps and a [dashboard](https://sonarcloud.io/organizations/schdief-github/projects).

## Regression testing with CYPRESS
We use cypress.io to perform our regression testing. It is automaticly triggered for all branches on UAT stage after the deployment. The results are published to Azure DevOps and a [dashboard](https://dashboard.cypress.io/#/projects/dhwwh4/runs).

## Load testing with OCTOPERF
We use octoperf.com to perform our load testing. It is automaticly triggered for `master` on UAT stage after the deployment. The results are published to a [dashboard](https://app.octoperf.com/#/app/workspace/AWDOItVk8EjRy3SNXm7S/project/AWn9_QbVnBB5lYSBzoW2/analysis).

# Stack
This app consists of multiple microservices, all based on [Express](https://expressjs.com/). They can be found in the `services` directory.
To deploy and run the services we are using [AKS](https://azure.microsoft.com/en-us/services/kubernetes-service/) and [helm](https://helm.sh). Our data is managed by [Azure Cosmos DB](https://docs.microsoft.com/en-us/azure/cosmos-db/introduction).

# Run
## Monitoring
To monitor our services we are using uptime robot that can be visited here:
https://uptimerobot.com/dashboard#mainDashboard

## Logs
Currently you have to look at the AKS logs, but we want to use Azure Logs.