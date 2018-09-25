const request = require("request");

module.exports = {
	getRating : oTitle => {
		return new Promise(resolve => {
			request(`http://www.omdbapi.com/?apikey=YOURAPIKEYHERE=${oTitle.name}`, (oError, oResponse, sBody) => {
				const oBody = !oError && oResponse && sBody && JSON.parse(sBody);
				resolve(oBody.imdbRating);
			})
		});
	}
};