# Database
In general we are using `MongoDB` as a database, because we hate `SQL` :)

## DEV/TEST
For our dev and test environments we use [mlab.com](https://mlab.com) and their sandbox environments. The configuration can be seen in `services/gui/config/default.json` (for DEV) or `test.json` (for TEST).

## UAT/PROD
We used to rely on Azures `CosmosDB` but the pricing failed us, therefore we've switched to a local `MongoDB` on `AKS`. To set it up we use the `Bitnami` image and `helm` with the parameters defined in `values-production.yaml`:
### UAT
```
helm install --name mongodb-moveez-uat -f ./values-production.yaml \
    --set mongodbRootPassword=uat,mongodbUsername=uat,mongodbPassword=uat,mongodbDatabase=uat \
    stable/mongodb
```
### PROD
With the initial deployment a `mongodbRootPassword` is defined and stored within `schdief`s iCloud Keychain. The other secrets are stored within Kubernetes as a secret called `TODO:`, defined within `TODO:` and deployed with:
```
TODO:
```

The database is deployed just like the UAT environment:
```
helm install --name mongodb-moveez-prod -f ./values-production.yaml \
    --set mongodbRootPassword=SECRET,mongodbUsername=SECRET,mongodbPassword=SECRET,mongodbDatabase=prod \
    stable/mongodb
```