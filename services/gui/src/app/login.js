const passport = require("passport");
const FacebookStrategy = require('passport-facebook').Strategy;
const fs = require('fs');

const FACEBOOK_APP_ID = 320908101860577;
const FACEBOOK_APP_SECRET_PATH = process.env.FACEBOOK_APP_SECRET_PATH;

const initialize = (app, port) => {
    const fbAppSecret = fs.readFileSync(FACEBOOK_APP_SECRET_PATH, 'utf8');

    passport.use(new FacebookStrategy(
        {
            clientID: FACEBOOK_APP_ID,
            clientSecret: fbAppSecret,
            callbackURL: `https://www.moveez.de:${port}/auth/facebook/callback`
        },
        function(accessToken, refreshToken, profile, done) {
              done(null, profile.id);
        }
    ));
    
    passport.serializeUser(function(user, cb) {
      cb(null, user);
    });
      
    passport.deserializeUser(function(obj, cb) {
      cb(null, obj);
    });
    
    app.use(passport.initialize());
    app.use(passport.session());


    // login page
    app.get(
        '/auth/facebook',
        passport.authenticate('facebook')
    );

    // login callback
    app.get(
        '/auth/facebook/callback',
        passport.authenticate('facebook', { failureRedirect: '/' }),
        function(req, res) {
            // Successful authentication, redirect home.
            res.redirect('/title');
        }
    );
}

module.exports = {initialize};