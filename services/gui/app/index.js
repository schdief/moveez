const https = require("https");
const fs = require("fs");
const { createApp } = require("./app");
const app = createApp();

//PARAMETERS
const PORT = process.env.PORT || 80; //PORT is defined by environment variable or 80
const TLS_KEY_PATH = process.env.TLS_KEY_PATH;
const TLS_CRT_PATH = process.env.TLS_CRT_PATH;
//SERVER
const HOST = "0.0.0.0";
const MODE = process.env.NODE_ENV || "default";
const RELEASE = process.env.RELEASE || "snapshot";

if (MODE === "default" && !process.env.AUTH) {
  const privateKey = fs.readFileSync(TLS_KEY_PATH, "utf8");
  const certificate = fs.readFileSync(TLS_CRT_PATH, "utf8");
  https
    .createServer({ key: privateKey, cert: certificate }, app)
    .listen(PORT, HOST, () => {
      console.log("🍿🍿🍿 MOVEEZ - manage your binge!");
      console.log(`${RELEASE} started with TLS on ${HOST}:${PORT}`);
      console.log("mode: " + MODE);
      // console.log(`db: ${dbConnectionString}`)
      console.log(`ketchup: ${process.env.KETCHUP_ENDPOINT}`);
    });
} else {
  //on uat and prod
  app.listen(PORT, () => {
    console.log("🍿🍿🍿 MOVEEZ - manage your binge!");
    console.log(`${RELEASE} started on ${HOST}:${PORT}`);
    console.log("mode: " + MODE);
    // console.log(`db: ${dbConnectionString} with ${dbPassword}`)
    console.log(`ketchup: ${process.env.KETCHUP_ENDPOINT}`);
  });
}
