//DEPENDENCIES
const session = require('./session');
const login = require('./login');
const connect = require('connect-ensure-login');
var express = require("express"),
    morgan = require("morgan"),
    title = require("./controllers/title"),
    landingPage = require("./controllers/landingPage"),
    impressum = require("./controllers/impressum"),
    bodyParser = require("body-parser"),
    mongoose = require("mongoose"),
    HttpStatus = require("http-status-codes"),
    methodOverride = require("method-override"),
    flash = require("connect-flash"),
    cookieParser = require('cookie-parser'),
    config = require("config") //load database configuration from config file

//PARAMETERS
const PORT = process.env.PORT || 80; //PORT is defined by environment variable or 80

//DATABASE
let dbUser
let dbPassword
var dbConnectionString = config.dbProtocol + "://" + config.dbHost + ":" + config.dbPort + "/" + config.dbName
if(process.env.NODE_ENV === "prod") {
    dbPassword = process.env.DB_PASS
    dbUser = process.env.DB_USER
} else {
    //since UAT and PROD share the same deployment config, UAT would use the PROD password from env
    dbPassword = config.dbPassword
    dbUser = config.dbUser
}

mongoose.connect(dbConnectionString, {
    auth: {
      user: dbUser,
      password: dbPassword
    },
    useNewUrlParser: true
  })
  .then(() => console.log('connection to db successful'))
  .catch((err) => console.log(err));

  const createApp = () => {
    // create express application
    const app = express();
    
    //LOGGING
    //don't show log when it is test
    if(process.env.NODE_ENV !== "test"){
        //use morgan to log at command line with Apache style
        app.use(morgan("combined"))
    }

    //parse application/json and look for raw text
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({extended: true}))
    app.use(bodyParser.text())
    app.use(bodyParser.json({type: "application/json"}))
    
    //allow PUT in HTML Form action
    app.use(methodOverride("_method"))
    
    // setup session
    session.initialize(app);
    
    // setup facebook login
    login.initialize(app, PORT);
    
    //enable flash messages
    app.use(cookieParser('secret'));
    app.use(flash())
    app.use((req, res, next) => {
        res.locals.success = req.flash("success")
        res.locals.error = req.flash("error")
        next()
    })

    //VIEW
    app.set("view engine", "ejs")
    app.use(express.static("views/public"))
    
    //ROUTES
    //index
    app.get("/", landingPage.landingPage);
    //healtcheck
    app.get('/health', function (req, res) {
        res.status(HttpStatus.OK)
        res.send()
    })
    app.get("/impressum", impressum.impressum);
    app.all("*", connect.ensureLoggedIn("/"));
    //title RESTful routes
    app.route("/title")
        .get(title.getTitles)
        .post(title.postTitle)
    app.route("/title/:id")
        .get(title.getTitle)
        .put(title.updateTitle)
        .delete(title.deleteTitle)

    return app;
};

//expose for integration testing with mocha
module.exports = {
    createApp
};
