# Ketchup
test
The service `ketchup` fetches data provided by [Rotten Tomatoes](rottentomatoes.com) like user ratings and provides them 
via an API to `moveez`.

This is necessary as currently Rotten Tomatoes doesn't provide an API for services like ours and there is neither a chance to use 
OMDb API nor another exisiting API or package to fetch the user rating of a title in their database.

It works by parsing a given URL and retrieving the given info with [cheerio](https://www.npmjs.com/package/cheerio).

It is a separate microservice for obvious reasons:
- scalability
- separation of concerns
- reusability
- upgradability

## Development
- `npm run dev` to start it locally with port 8083
- `npm start` to start it in production with port 8080
- `npm test` to run integration tests with mocha