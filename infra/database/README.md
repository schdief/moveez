# Database
In general we are using `MongoDB` as a database, because we hate `SQL` :)

## DEV/TEST
For our dev and test environments we use [mlab.com](https://mlab.com) and their sandbox environments. The configuration can be seen in `services/gui/config/default.json` (for DEV) or `test.json` (for TEST).

## UAT/PROD
We used to rely on Azures `CosmosDB` but the pricing failed us, therefore we've switched to a local `MongoDB` on `AKS`. To set it up we use the [Bitnami](https://github.com/helm/charts/tree/master/stable/mongodb) image and `helm` with the parameters defined in `values-production.yaml`:

### UAT
The database is deployed like that:
```
helm install --name mongodb-moveez-uat -f ./values-production.yaml \
    --set mongodbRootPassword=uat,mongodbUsername=uat,mongodbPassword=uat,mongodbDatabase=uat \
    stable/mongodb
```

### PROD
With the initial deployment a `mongodbRootPassword` is defined and stored within `schdief`s iCloud Keychain as `moveez_prod_db_admin`. The other keys are stored within Kubernetes as a secret called `moveez-prod-db`, defined within `moveez-prod-db-secret.yaml` and deployed with:
```
kubectl apply -f moveez-prod-db-secret.yaml
```

The database is deployed just like the `UAT` environment:
```
helm install --name mongodb-moveez-prod -f ./values-production.yaml \
    --set mongodbRootPassword=SECRET,mongodbUsername=SECRET,mongodbPassword=SECRET,mongodbDatabase=prod \
    stable/mongodb
```