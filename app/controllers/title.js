var Title = require("../models/title"),
    mongoose = require("mongoose"),
    HttpStatus = require("http-status-codes")

//CREATE POST /title to add a new title
function postTitle(req, res){
    //metrics, but not during test
    if(process.env.NODE_ENV !== "test"){
        console.log("metrics.postTitle")
    }
    var newTitle = new Title(req.body.title)
    newTitle.save((err, title) => {
        if(err) {
            res.status(HttpStatus.NOT_FOUND)
                .send(err)
        } else {
            //respond with JSON when asked (for API calls and integration testing), otherwise render HTML
            if(req.get('Accept') === "text/json"){
                res.status(HttpStatus.CREATED)
                    .json({message: "Title successfully added!", title})
            } else {
                req.flash("success", "You've added '" + title.name + "'' to your watchlist!")
                res.redirect("title")
            }
        }
    })
}

//READ GET /title to retrieve all titles
function getTitles(req, res){
    //metrics, but not during test
    if(process.env.NODE_ENV !== "test"){
        console.log("metrics.getTitles")
    }
    var query = Title.find(undefined, undefined, {sort:{createdAt:-1}});
    query.exec((err, titles) => {
        if(err) {
            res.status(HttpStatus.NOT_FOUND)
                .send(err)
        } else {
            //respond with JSON when asked (for API calls and integration testing), otherwise render HTML
            if(req.get('Accept') === "text/json"){
                res.json(titles)
            } else {
                res.render("title/index", {titles: titles})
            }
        }
    })
}

//READ GET /title/:id to retrieve a title
function getTitle(req, res){
    //metrics, but not during test
    if(process.env.NODE_ENV !== "test"){
        console.log("metrics.getTitle")
    }
    var query = Title.findById(req.params.id)
    query.exec((err, title) => {
        if(err) {
            res.status(HttpStatus.NOT_FOUND)
                .send(err)
        } else {
            //respond with JSON when asked (for API calls and integration testing), otherwise render HTML
            if(req.get('Accept') === "text/json"){
                res.json(title)
            } else {
                res.redirect("/title")
            }
        }
    })
}

//UPDATE PUT /title/:id to update a title
function updateTitle(req, res){
    //metrics, but not during test
    if(process.env.NODE_ENV !== "test"){
        console.log("metrics.updateTitle")
    }
    //check for name in body
    if(req.body.title.name !== "") {
        var query = Title.findByIdAndUpdate(req.params.id, req.body.title, {new: true})
        query.exec((err, updatedTitle) => {
            if(err) {
                res.status(HttpStatus.NOT_FOUND)
                    .send(err)
            } else {
                    //respond with JSON when asked (for API calls and integration testing), otherwise render HTML
                    if(req.get('Accept') === "text/json"){
                        res.json({message: "Title successfully updated!", updatedTitle})
                    } else {
                        if(req.body.title.seen) {
                            if(updatedTitle.seen === true)
                            {
                                req.flash("success", "You've marked '" + updatedTitle.name + "' as seen!")
                            } else {
                                req.flash("success", "You've marked '" + updatedTitle.name + "' as unseen!")
                            }
                        } else {
                            req.flash("success", "You've changed the name to '" + updatedTitle.name + "'!")
                        }
                        res.redirect("/title")
                    }
            }
        })
    } else {
        //respond with JSON when asked (for API calls and integration testing), otherwise render HTML
        if(req.get('Accept') === "text/json"){
            res.status(HttpStatus.BAD_REQUEST)
                .send("You need to specify a name and it can't be empty!")
        } else {
            res.redirect("/title")
        }
    }
}

//DELETE DELETE /title/:id to delete a title
function deleteTitle(req, res){
    //metrics, but not during test
    if(process.env.NODE_ENV !== "test"){
        console.log("metrics.deleteTitle")
    }
    var query = Title.findByIdAndRemove(req.params.id, req.body.title)
    query.exec((err, deletedTitle) => {
        if(err) {
            res.status(HttpStatus.NOT_FOUND)
                .send(err)
        } else {
            //respond with JSON when asked (for API calls and integration testing), otherwise render HTML
            if(req.get('Accept') === "text/json"){
                res.json({message: "Title successfully deleted!", deletedTitle})
            } else {
                req.flash("success", "You've deleted '" + deletedTitle.name + "'' from your watchlist!")
                res.redirect("/title")
            } 
        }
    })
}

//export all functions
module.exports = { getTitles, getTitle, postTitle, updateTitle, deleteTitle };