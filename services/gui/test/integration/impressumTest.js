const { createApp } = require("../../app/app.js");
let app;

var chai = require("chai"),
  chaitHttp = require("chai-http");

chai.use(chaitHttp);

describe("ImpressumTest", () => {
  before(() => {
    app = createApp();
  });

  describe("Index", () => {
    it("it should show the impressum page", done => {
      chai
        .request(app)
        .get("/impressum")
        .end((err, res) => {
          res.should.have.status(200);
          res.text.should.have.string("Data Privacy Statement");
          done();
        });
    });
  });
});
