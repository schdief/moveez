const {createApp} = require("../../app/app.js");
let app;

var chai = require("chai"),
    chaitHttp = require("chai-http"),
    should = chai.should();
    
chai.use(chaitHttp)

describe("indexTest", () => {

    before(() => {
        app = createApp();
    })

    describe("Index", () => {
        it("it should show the welcome message", (done) => {
            chai.request(app)
                .get("/")
                .set('Accept', 'application/json')
                .end((err, res) => {
                    res.should.have.status(200)
                    res.should.be.json
                    res.body.should.have.property("message").eql("Welcome to mocha test!")
                    done()
            })
        })    
    })
});
