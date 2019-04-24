//DEPENDENCIES
const session = require('./session');
const login = require('./login');
const https = require('https');
const fs = require('fs');
const connect = require('connect-ensure-login');
var express = require("express"),
    morgan = require("morgan"),
    title = require("./controllers/title"),
    landingPage = require("./controllers/landingPage"),
    impressum = require("./controllers/impressum"),
    bodyParser = require("body-parser"),
    mongoose = require("mongoose"),
    methodOverride = require("method-override"),
    flash = require("connect-flash"),
    cookieParser = require('cookie-parser'),
    config = require("config") //load database configuration from config file

//PARAMETERS
const TLS_KEY_PATH = process.env.TLS_KEY_PATH;
const TLS_CRT_PATH = process.env.TLS_CRT_PATH;
const PORT = process.env.PORT || 80; //PORT is defined by environment variable or 80

// create express application
const app = express();

//LOGGING
//don't show log when it is test
if(process.env.NODE_ENV !== "test"){
    //use morgan to log at command line with Apache style
    app.use(morgan("combined"))
}

//DATABASE
const dbUser = process.env.DB_USER || config.dbUser
const dbPassword
var dbConnectionString = config.dbProtocol + "://" + config.dbHost + ":" + config.dbPort + "/" + config.dbName
if(process.env.NODE_ENV === "prod") {
    //CosmosDB requires ssl=true
    dbConnectionString += "?ssl=true&replicaSet=globaldb"
    dbPassword = process.env.DB_PASS
} else {
    //since UAT and PROD share the same deployment config, UAT would use the PROD password from env
    dbPassword = config.dbPassword
}

mongoose.connect(dbConnectionString, {
    auth: {
      user: dbUser,
      password: dbPassword
    }
  })
  .then(() => console.log('connection to db successful'))
  .catch((err) => console.log(err));
var db = mongoose.connection

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

//SERVER
const HOST = '0.0.0.0'
const MODE = process.env.NODE_ENV || "default"
const RELEASE = process.env.RELEASE || "snapshot"

if (MODE === "default") {
    const privateKey  = fs.readFileSync(TLS_KEY_PATH, 'utf8');
    const certificate = fs.readFileSync(TLS_CRT_PATH, 'utf8');
    https.createServer({key:privateKey, cert:certificate}, app).listen(PORT, HOST, () => {
        console.log("🍿🍿🍿 MOVEEZ - manage your binge!")
        console.log(`${RELEASE} started with TLS on ${HOST}:${PORT}`);
        console.log("mode: " + MODE)
        console.log(`db: ${dbConnectionString}`)
        console.log(`ketchup: ${process.env.KETCHUP_ENDPOINT}`)
    })  
} else {
    //on uat and prod
    app.listen(PORT, () => {
        console.log("🍿🍿🍿 MOVEEZ - manage your binge!")
        console.log(`${RELEASE} started on ${HOST}:${PORT}`);
        console.log("mode: " + MODE)
        console.log(`db: ${dbConnectionString}`)
        console.log(`ketchup: ${process.env.KETCHUP_ENDPOINT}`)
    })  
}

//expose for integration testing with mocha
module.exports = app
