const impressum = (req, res) => {
  const username = req.user ? req.user.displayName : undefined;
  console.log("rendering impressung");
  res.render("impressum/index", { username });
};

module.exports = {
  impressum
};
