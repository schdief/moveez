const session = require("express-session");

const initialize = app => {
  // TODO: make sessions and secret persistent across nodes
  const sessionSecret = Math.random()
    .toString(36)
    .substring(2, 15);
  app.use(
    session({
      secure: true,
      secret: sessionSecret,
      resave: true,
      saveUninitialized: true
    })
  );
};

module.exports = { initialize };
