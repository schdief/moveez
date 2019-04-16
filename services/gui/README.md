# Development
* `npm install` to install dependencies
* `npm run dev` to start app locally
* `npm test` to run integration tests locally
* `npm run cy:open` to open cypress.io to manage acceptance tests

# Facebook Login
The app uses facebook login for authentication. Tests run without it but `npm run dev` requires the facebook app secret and a self-signed TLS certificate to function properly. See below for how to set these up.

# Create Self-Signed TLS Certificate
Run this command in services/gui/tlscert to generate a self-signed TLS certificate for the local TLS enabled server
`openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt -days 365 -nodes`

# Add Facebook App Secret
Access the moveez app page on https://developers.facebook.com . Go to settings > general and copy the app-secret
Paste it as services/gui/facebook/app_secret
Alternatively the facebook app secret can be provided as environment variable FACEBOOK_APP_SECRET