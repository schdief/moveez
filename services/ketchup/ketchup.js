const { Pool } = require("pg"); // Importing the PostgreSQL client

// Database connection setup
const pool = new Pool({
  user: "your_username", // Update with your PostgreSQL username
  host: "localhost",
  database: "your_database", // Update with your PostgreSQL database name
  password: "your_password", // Update with your PostgreSQL password
  port: 5432,
});

// Update the rating logic
app.get("/:id", async function(req, res) {
  console.log("INF: Request for " + req.params.id);

  if (req.params.id !== "empty") {
    try {
      // Check the database for an existing rating
      const result = await pool.query("SELECT rating FROM ratings WHERE id = $1", [req.params.id]);
      if (result.rows.length > 0) {
        const tomatoUserRating = result.rows[0].rating;
        console.log(`INF: Got it! ✌️  Rating is: ${tomatoUserRating} for ${req.params.id}`);
        res.status(HttpStatus.OK).json({ tomatoUserRating });
      } else {
        // Fetch from Rotten Tomatoes if not found in the database
        superagent.get(baseURL + req.params.id).end(async (err, response) => {
          if (err) {
            error = `ERR: got a ${err.status} for ${baseURL}${req.params.id} 😭😭😭`;
            console.log(error);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(error);
          } else {
            var $ = cheerio.load(response.text);
            var tomatoUserRatingRaw = $("span.mop-ratings-wrap__percentage").eq(1).text();
            const indexOfPercentageCharacter = tomatoUserRatingRaw.indexOf("%");
            if (indexOfPercentageCharacter != -1) {
              var tomatoUserRating = tomatoUserRatingRaw.substring(0, indexOfPercentageCharacter).replace(/\s/g, "");
              console.log(`INF: Got it! ✌️  Rating is: ${tomatoUserRating} for ${req.params.id}`);
              res.status(HttpStatus.OK).json({ tomatoUserRating });

              // Save the rating in the database
              await pool.query("INSERT INTO ratings (id, rating) VALUES ($1, $2)", [req.params.id, tomatoUserRating]);
            } else {
              error = `ERR: couldn't find a rating for ${req.params.id} - sorry 😭😭😭`;
              console.log(error);
              res.send(error);
            }
          }
        });
      }
    } catch (error) {
      console.error("Database error:", error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Database error");
    }
  } else {
    error = "ERR: URL missing 😭";
    console.log(error);
    res.status(HttpStatus.EXPECTATION_FAILED).send(error);
  }
});
