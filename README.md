# About
[![Build Status gui](https://dev.azure.com/Schdieflaw0018/moveez/_apis/build/status/gui?branchName=master)](https://dev.azure.com/Schdieflaw0018/moveez/_build/latest?definitionId=2&branchName=master)

`Moveez` is a service to keep track of the movies you would like to watch in future. It shows you the ratings from sites like iMDB.com and Rottentomatoes.com.

[Visit us](https://www.moveez.de)

Future updates might include:
- It even alerts you when a movie is running in cinema or is available on a VoD-plattform of your choice.
- Furthermore you can browse your list by ratings, release date or genre.
- an own score calculated by the individual ratings of all moveez-users.

![Screenshot](https://github.com/schdief/moveez/blob/master/screenshot.jpg)

## CI/CD with Azure DevOps
We have switched from Jenkins to Azure DevOps. You can find the workspace [here](https://dev.azure.com/Schdieflaw0018/moveez/).
Within Azure DevOps we are using Azure Pipelines to build and release moveez.
* The build configuration is done via `azure-pipelines.yml` per service.
* The release is currently configured in GUI due to lack of support of release config files.

# Stack
This app consists of multiple microservices, all based on [Express](https://expressjs.com/). They can be found in the `services` directory.
To deploy and run the services we are using [AKS](https://azure.microsoft.com/en-us/services/kubernetes-service/) and [helm](https://helm.sh). Our data is managed by [Azure Cosmos DB](https://docs.microsoft.com/en-us/azure/cosmos-db/introduction).

# Run
## Monitoring
To monitor our services we are using uptime robot that can be visited here:
https://uptimerobot.com/dashboard#mainDashboard

## Logs
Currently you have to look at the AKS logs, but we want to use Azure Logs.