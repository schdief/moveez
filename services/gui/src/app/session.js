const session = require('express-session');
const fs = require('fs');

const SESSION_SECRET_PATH = process.env.SESSION_SECRET_PATH;

const initialize = app => {
    const sessionSecret = fs.readFileSync(SESSION_SECRET_PATH, 'utf8');

    app.use(session({
        secure: true,
        secret: sessionSecret,
        resave: true,
        saveUninitialized: true,
        cookie: { maxAge: 60000 }
    }));
}

module.exports = {initialize};