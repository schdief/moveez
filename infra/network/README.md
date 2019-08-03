# Networking
To enable external connectivity, we need a domain, an inbound loadbalancer and TLS (https) encryption.
This instruction set is based on an [azure online guide](https://docs.microsoft.com/de-de/azure/aks/ingress-tls). The custom domain part is taken from this nice [guide](https://github.com/fbeltrao/aks-letsencrypt).

## Ingress (External Inbound Loadbalancer)
An ingress controller is a piece of software that provides reverse proxy, configurable traffic routing, and TLS termination for Kubernetes services. Kubernetes ingress resources are used to configure the ingress rules and routes for individual Kubernetes services. Using an ingress controller and ingress rules, a single IP address can be used to route traffic to multiple services in a Kubernetes cluster.

The ingress controller is basicly a NGINX serving as a reverse proxy. It is installed automatically by Rancher for every node and cluster and can be found in namespace `ìngress-nginx`.

## DNS
### Add domain to Azure DNS
Now we let Azure DNS manage our DNSing. Therefore we create an Azure DNS service and change the NX records of our domain to Azure's as described [here](http://www.reimling.eu/2018/01/einrichtung-und-konfiguration-von-azure-dns/). You'll get the public IP from Hetzner Cloud Portal - it is the one of the node.

### Deploy ingress for www.moveez.de
To activate www.moveez.de we need to deploy a special ingress. Use the ingress.yaml within this folder and apply it with `kubectl apply -f ingress.yaml`

### Add A records to DNS pointing to the Ingress Controller's public IP
In your Azure DNS click "+ record set" and type in `www` with a TTL of 1 hour. Do the same again but without the `www` for the `apex` (or root or naked domain entry).

### Add a CAA record for better TLS rating
Add a CAA record to define which CAs can issue TLS for the domain. Use this command:
```
az network dns record-set caa add-record -g moveez -z moveez.de -n "*" --flags 0 --tag "issue" --value "letsencrypt.org"
```

## TLS
The goal of this step is to have a cluster-wide wildcard certificate serving *.moovez.de. We leverage Let's Encrypt to perform TLS termination in the ingress controller.

The key component here is cert-manager that does automatically provisioning of TLS certificates in Kubernetes. Underneath the hood it does the required work to adquire certificates from Let's Encrypt. For wildcard certificates we rely on DNS-01 validation.

Let's Encrypt has a production and a staging environment. Staging provides a fake certificates, but has a high rate limit. Production produces a valid certificate, but has rate limits. For testing purposes use the staging environment, otherwise rate limits might be reached, preventing the creation of new certificates.

We'll follow [this guide](https://www.idealcoders.com/posts/rancher/2018/06/rancher-2-x-and-lets-encrypt-with-cert-manager-and-nginx-ingress/) here.

### Install cert-manager
The NGINX ingress controller supports TLS termination. There are several ways to retrieve and configure certificates for HTTPS. This article demonstrates using cert-manager, which provides automatic Lets Encrypt certificate generation and management functionality.

Just follow the above mentioned guide to install it via GUI in Rancher.

### Add the service principal as contributor of your DNS Zone for cert-manager
Cert-Manager needs to access the DNS-Zone for the DNS-01 challenge.

#### Create service principal
Following [this guide](https://docs.cert-manager.io/en/latest/tasks/issuers/setup-acme/dns01/azuredns.html) we'll create a new service principal to access Azure DNS.

```
# define variables
AZURE_CERT_MANAGER_SP_NAME=rancher
AZURE_CERT_MANAGER_SP_PASSWORD=SOME_PASSWORD
AZURE_CERT_MANAGER_DNS_RESOURCE_GROUP=moveez
AZURE_CERT_MANAGER_DNS_NAME=moveez.de

# create service account and store application ID
AZURE_CERT_MANAGER_SP_APP_ID=$(az ad sp create-for-rbac --name $AZURE_CERT_MANAGER_SP_NAME --password $AZURE_CERT_MANAGER_SP_PASSWORD --query "appId" --output tsv)

# it might fail to store the ID, in this case just query the active directory app registration manually via GUI and then store the ID yourself
AZURE_CERT_MANAGER_SP_APP_ID=***

# Lower the Permissions of the SP
az role assignment delete --assignee $AZURE_CERT_MANAGER_SP_APP_ID --role Contributor

# Give Access to DNS Zone
DNS_ID=$(az network dns zone show --name $AZURE_CERT_MANAGER_DNS_NAME --resource-group $AZURE_CERT_MANAGER_DNS_RESOURCE_GROUP --query "id" --output tsv)
az role assignment create --assignee $AZURE_CERT_MANAGER_SP_APP_ID --role "DNS Zone Contributor" --scope $DNS_ID

# Check Permissions
az role assignment list --assignee $AZURE_CERT_MANAGER_SP_APP_ID

# Create Secret
kubectl create --namespace=cert-manager secret generic azuredns-config \
  --from-literal=CLIENT_SECRET=$AZURE_CERT_MANAGER_SP_PASSWORD

# Get the Service Principal App ID for configuration
echo $AZURE_CERT_MANAGER_SP_APP_ID

### Deploy wildcard cluster issuer
Amost done, now we need to set up a cluster-issuer that listens for new certificate objects and creates orders for the cert-manager to create new valid certificates.
```
kubectl create -f cluster-issuer.yml --namespace cert-manager
```

### Create the wildcard certifacte request for *.moovez.de
```
kubectl create -f certificate.yml
```