# How-To develop and run the service

|script        | action | TLS | authentication
| ------------- |:-------------:| -----:|---:|
|`dev`         | start app locally | yes (!NODE_ENV) | facebook login (!AUTH=='basic')
|`watch`       | start app locally and automatically rerun after code changes | yes (!NODE_ENV) | facebook login (!AUTH=='basic')
|`test`        | run integration tests locally | no (!!NODE_ENV) | always authenticated
|`uat`         | run app with configuration for local uat tests |  no (!NODE_ENV) | basic auth user:cypress/pass:cypress (AUTH=='basic')
|`cy:open`     | open cypress.io to manage acceptance tests
|`cy:uat`      | run cypress tests
|`start`       | start the app. This is used in production and uat environment of the cicd pipeline. | no | basic auth user:cypress/pass:cypress (NODE_ENV=='uat') or facebook login (NODE_ENV='prod')

# Facebook Login
The app uses facebook login for authentication. Tests run without it but `npm run dev` requires the facebook app secret and a self-signed TLS certificate to function properly. See below for how to set these up.

## Create Self-Signed TLS Certificate
Run this command in services/gui/tlscert to generate a self-signed TLS certificate for the local TLS enabled server
`openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt -days 365 -nodes`

## Add Facebook App Secret
Access the moveez app page on https://developers.facebook.com. Go to settings > general and copy the app-secret.
Then either:
- Paste it as services/gui/facebook/app_secret
- Alternatively the facebook app secret can be provided as environment variable FACEBOOK_APP_SECRET
- in production we need a secret called `moveez-prod-facebook` containing the base64 encoded app secret string as value `appsecret`