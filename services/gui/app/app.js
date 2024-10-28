const session = require("./session");
const login = require("./login");
const connect = require("connect-ensure-login");
const express = require("express");
const morgan = require("morgan");
const title = require("./controllers/title");
const landingPage = require("./controllers/landingPage");
const impressum = require("./controllers/impressum");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const HttpStatus = require("http-status-codes");
const methodOverride = require("method-override");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");
const config = require("config"); //load database configuration from config file

//PARAMETERS
const PORT = process.env.PORT || 80; //PORT is defined by environment variable or 80

//DATABASE
let dbUser;
let dbPassword;
let dbConnectionString =
  config.dbProtocol +
  "://" +
  config.dbHost +
  ":" +
  config.dbPort +
  "/" +
  config.dbName;
if (process.env.NODE_ENV === "prod") {
  dbPassword = process.env.DB_PASS;
  dbUser = process.env.DB_USER;
} else {
  //since UAT and PROD share the same deployment config, UAT would use the PROD password from env
  dbPassword = config.dbPassword;
  dbUser = config.dbUser;
}

const pool = new Pool({
  connectionString: dbConnectionString,
  user: dbUser,
  password: dbPassword,
});

pool
  .connect()
  .then(() => console.log("connection to db successful"))
  .catch((err) => console.log(err));

const createApp = () => {
  // create express application
  const app = express();

  //LOGGING
  //don't show log when it is test
  if (process.env.NODE_ENV !== "test") {
    //use morgan to log at command line with Apache style
    app.use(morgan("combined"));
  }

  //parse application/json and look for raw text
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.text());
  app.use(bodyParser.json({ type: "application/json" }));

  //allow PUT in HTML Form action
  app.use(methodOverride("_method"));

  // setup session
  session.initialize(app);

  // setup facebook login
  login.initialize(app, PORT);

  //enable flash messages
  app.use(cookieParser("secret"));
  app.use(flash());
  app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
  });

  //VIEW
  app.set("view engine", "ejs");
  app.use(express.static("views/public"));

  //ROUTES
  //index
  app.get("/", landingPage.landingPage);
  //healtcheck
  app.get("/health", function (req, res) {
    res.status(HttpStatus.OK);
    res.send();
  });
  app.get("/impressum", impressum.impressum);
  app.all("*", connect.ensureLoggedIn("/"));
  //title RESTful routes
  app
    .route("/title")
    .get(title.getTitles)
    .post(title.postTitle);
  app
    .route("/title/:id")
    .get(title.getTitle)
    .put(title.updateTitle)
    .delete(title.deleteTitle);

  return app;
};

//expose for integration testing with mocha
module.exports = {
  createApp,
};
