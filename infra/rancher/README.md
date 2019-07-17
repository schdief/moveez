# Rancher
To run our services we are using [Rancher](https://rancher.com). The infrastructure is provided by [Hetzner Cloud](https://console.hetzner.cloud/projects).

# Setup
The whole setup is based on this [guide in the Hetzner Community](https://community.hetzner.com/tutorials/hcloud-install-rancher-single).

## Server
Create a new server within the Hetzner Cloud GUI. We have selected a CX21 (2 CPU, 4GB RAM, 40GB SSD, 20GB Traffic) instance based on Cent OS 7 and running in Nürnberg.
Skip the volumes and network section, activate backups and enter the following config to the `user data`section:
```
package_upgrade: true

packages:
    - yum-utils
    - device-mapper-persistent-data
    - lvm2

runcmd:
    - yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    - yum install -y docker-ce docker-ce-cli containerd.io
    - systemctl enable docker
    - systemctl start docker
```
Specify your SSH key and order the VM.

HINT: in case the user data didn't work, perform the following steps yourself on the machine:
```
yum update -y
yum install  yum-utils device-mapper-persistent-data lvm2 -y
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
systemctl enable docker

```

## DNS
Add an `A-record set`named `rancher.moveez.de` to your DNS zone inside `Azure DNS`.

## Start Rancher
As Rancher is provided as a docker image we only need to run it. Connect to your server with:
```
ssh root@rancher.moveez.de
```

Then start rancher with:
```
docker run -d --restart=unless-stopped \
    -p 80:80 -p 443:443 \
    rancher/rancher:latest \
    --acme-domain rancher.moveez.de
```

Define a password for the admin user and login.

## Setup Hetzner Cloud Node Driver
To create a cluster within Hetzner Cloud we'll need to add it manually as a driver, based on the [ui-driver-hetzner](https://github.com/mxschmitt/ui-driver-hetzner).
Open [rancher.moveez.de](https://rancher.moveez.de) and go to `Tools -> Drivers`. On this page, click on the Tab `Node Drivers` and the button `Add Node Driver` on the right side.
A new dialog opens. Enter the following values:
- Download URL: https://github.com/JonasProgrammer/docker-machine-driver-hetzner/releases/download/1.2.2/docker-machine-driver-hetzner_1.2.2_linux_amd64.tar.gz
- Custom UI Url: https://storage.googleapis.com/hcloud-rancher-v2-ui-driver/component.js
- Checksum: Skip / leave empty
- Whitelist Domains: storage.googleapis.com

Click `Create`. A new entry `Hetzner` should appear and shortly afterwards shown as `Active`.

## Add Clusters for UAT and PROD
We'll add 2 seperate clusters, one for `UAT` and one for `PROD`. Follow those steps to do so (same for UAT and PROD):

1. Navigate to `Clusters` and click `add cluster`.
2. Select `Hetzner` as a `node in an infrastructure provider`.
3. `cluster name` = moveez-UAT (or moveez-PROD)
4. Node Pools
- `name prefix`: moveez-uat (or moveez-prod)
- `count`: 1x
- `template`: add template with CX21 instance based on Centos 7 in Nürnberg (requires to enter Hetzner API-Token)
- `etcd`: yes
- `control pane`: yes
- `worker`: yes
5. Cluster options
- `Kubernetes Version`: v1.14.3-rancher1-1
- `Network Provider`: Canal
- `Project Network Isolation`: Enabled
- `Cloud Provider`: none