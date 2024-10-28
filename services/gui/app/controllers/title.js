const { Title } = require("../models/title");
const HttpStatus = require("http-status-codes");
const superagent = require("superagent");

//CREATE POST /title to add a new title
async function postTitle(req, res) {
  //metrics, but not during test
  if (process.env.NODE_ENV !== "test") {
    console.log("metrics.postTitle");
  }

  const newTitle = {
    ...req.body.title,
    user: req.user.id,
    imdbRating: req.body.title.imdbRating || -1,
  };

  //get path of tomatoURL
  let path;
  if (req.body.title.tomatoURL) {
    path = req.body.title.tomatoURL.substring(
      req.body.title.tomatoURL.indexOf("m/") + 4
    );
  }

  try {
    const response = await superagent.get(
      `http://${process.env.KETCHUP_ENDPOINT}/${path}`
    );
    newTitle.tomatoUserRating = response.body.tomatoUserRating;
  } catch (err) {
    console.log(
      `WAR: 🍅 KETCHUP failed us 😭, assuming there is no rating, here is the reason: ${err}`
    );
    newTitle.tomatoUserRating = -1;
  }

  try {
    const title = await Title.create(newTitle);
    if (req.get("Accept") === "application/json") {
      res
        .status(HttpStatus.CREATED)
        .json({ message: "Title successfully added!", title });
    } else {
      req.flash(
        "success",
        "You've added '" + title.name + "'' to your watchlist!"
      );
      res.redirect("title");
    }
  } catch (sErr) {
    res.status(HttpStatus.NOT_FOUND).send(sErr);
  }
}

//READ GET /title to retrieve all titles
async function getTitles(req, res) {
  //metrics, but not during test
  if (process.env.NODE_ENV !== "test") {
    console.log("metrics.getTitles");
  }

  try {
    const titles = await Title.findAll({
      where: { user: req.user.id },
      order: [["createdAt", "DESC"]],
    });

    if (req.get("Accept") === "application/json") {
      res.json(titles);
    } else {
      res.render("title/index", {
        titles: titles,
        username: req.user.displayName,
      });
    }
  } catch (err) {
    res.status(HttpStatus.NOT_FOUND).send(err);
  }
}

//READ GET /title/:id to retrieve a title
async function getTitle(req, res) {
  //metrics, but not during test
  if (process.env.NODE_ENV !== "test") {
    console.log("metrics.getTitle");
  }

  try {
    const title = await Title.findOne({
      where: { id: req.params.id, user: req.user.id },
    });

    if (!title) {
      res.status(HttpStatus.NOT_FOUND).send("Title not found");
    } else {
      if (req.get("Accept") === "application/json") {
        res.json(title);
      } else {
        res.redirect("/title");
      }
    }
  } catch (err) {
    res.status(HttpStatus.NOT_FOUND).send(err);
  }
}

//UPDATE PUT /title/:id to update a title
async function updateTitle(req, res) {
  //metrics, but not during test
  if (process.env.NODE_ENV !== "test") {
    console.log("metrics.updateTitle");
  }

  if (req.body.title.name !== "") {
    try {
      const [updated] = await Title.update(
        { ...req.body.title, user: req.user.id },
        { where: { id: req.params.id, user: req.user.id }, returning: true }
      );

      if (!updated) {
        res.status(HttpStatus.NOT_FOUND).send("Title not found");
      } else {
        const updatedTitle = await Title.findOne({
          where: { id: req.params.id, user: req.user.id },
        });

        if (req.get("Accept") === "application/json") {
          res.json({ message: "Title successfully updated!", updatedTitle });
        } else {
          if (req.body.title.seen) {
            if (updatedTitle.seen === true) {
              req.flash(
                "success",
                "You've marked '" + updatedTitle.name + "' as seen!"
              );
            } else {
              req.flash(
                "success",
                "You've marked '" + updatedTitle.name + "' as unseen!"
              );
            }
          } else {
            req.flash(
              "success",
              "You've changed the name to '" + updatedTitle.name + "'!"
            );
          }
          res.redirect("/title");
        }
      }
    } catch (err) {
      res.status(HttpStatus.NOT_FOUND).send(err);
    }
  } else {
    if (req.get("Accept") === "application/json") {
      res
        .status(HttpStatus.BAD_REQUEST)
        .send("You need to specify a name and it can't be empty!");
    } else {
      res.redirect("/title");
    }
  }
}

//DELETE DELETE /title/:id to delete a title
async function deleteTitle(req, res) {
  //metrics, but not during test
  if (process.env.NODE_ENV !== "test") {
    console.log("metrics.deleteTitle");
  }

  try {
    const deleted = await Title.destroy({
      where: { id: req.params.id, user: req.user.id },
    });

    if (!deleted) {
      res.status(HttpStatus.NOT_FOUND).send("Title not found");
    } else {
      if (req.get("Accept") === "application/json") {
        res.json({ message: "Title successfully deleted!" });
      } else {
        req.flash(
          "success",
          "You've deleted '" + req.body.title.name + "'' from your watchlist!"
        );
        res.redirect("/title");
      }
    }
  } catch (err) {
    res.status(HttpStatus.NOT_FOUND).send(err);
  }
}

//export all functions
module.exports = { getTitles, getTitle, postTitle, updateTitle, deleteTitle };
