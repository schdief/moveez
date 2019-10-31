import { isInWatchList } from "/base/app/views/public/title.js";
chai.should();

describe("app", () => {
  describe("isInWatchList", () => {
    it("returns false if given movie is not in watchlist", () => {
      // setup
      const movie = {};
      window.moveez = { titles: [] };

      // run
      const bIsInWatchList = isInWatchList(movie);

      // check
      bIsInWatchList.should.equal(false);

      // clean up
      delete window.moveez;
    });

    it("returns true if given movie is contained in watchlist", () => {
      // setup
      const movie = {};
      const otherMovie = {};
      window.moveez = { titles: [otherMovie, movie] };

      // run
      const bIsInWatchList = isInWatchList(movie);

      // check
      bIsInWatchList.should.equal(true);

      // clean up
      delete window.moveez;
    });
  });
});
