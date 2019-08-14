const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;
const LocalStrategy = require("passport-http").BasicStrategy;
const fs = require("fs");

const LOCAL_AUTH =
  process.env.AUTH === "basic" || process.env.NODE_ENV === "uat";
const DEV_MODE = !process.env.NODE_ENV;
const FACEBOOK_APP_ID = 320908101860577;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_APP_SECRET_PATH = process.env.FACEBOOK_APP_SECRET_PATH;

const initialize = (app, port) => {
  let fbAppSecret;
  if (FACEBOOK_APP_SECRET) {
    fbAppSecret = FACEBOOK_APP_SECRET;
  } else if (FACEBOOK_APP_SECRET_PATH) {
    fbAppSecret = fs.readFileSync(FACEBOOK_APP_SECRET_PATH, "utf8");
  }

  const facebookStrategy = new FacebookStrategy(
    {
      clientID: FACEBOOK_APP_ID,
      clientSecret: fbAppSecret,
      callbackURL: DEV_MODE
        ? `https://localhost:${port}/auth/facebook/callback`
        : "https://www.moveez.de/auth/facebook/callback"
    },
    function(accessToken, refreshToken, profile, done) {
      done(null, profile);
    }
  );

  const customStrategy = new LocalStrategy((user, pass, done) =>
    user === "cypress" && pass === "cypress"
      ? done(null, { id: user, displayName: user })
      : done(null, false)
  );

  const authorizationStrategy = LOCAL_AUTH ? customStrategy : facebookStrategy;

  passport.use("authorization", authorizationStrategy);

  passport.serializeUser(function(user, cb) {
    cb(null, user);
  });

  passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
  });

  app.use(passport.initialize());
  app.use(passport.session());

  // login page
  if (LOCAL_AUTH) {
    app.post(
      "/login",
      passport.authenticate("authorization", {
        successRedirect: "/",
        failureRedirect: "/error"
      })
    );
  }

  app.get("/auth/facebook", passport.authenticate("authorization"), function(
    req,
    res
  ) {
    // Successful authentication, redirect home.
    res.redirect("/title");
  });

  // login callback
  app.get(
    "/auth/facebook/callback",
    passport.authenticate("authorization", { failureRedirect: "/" }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect("/title");
    }
  );

  app.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/");
  });
};

module.exports = { initialize };
