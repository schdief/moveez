const landingPage = (req, res) => {
    if(req.get('Accept') === "application/json"){
        res.json({message: "Welcome to " + process.env.RELEASE + "!"});
        return;
    }
    res.render("landingPage/index");
};

module.exports = {
    landingPage
}