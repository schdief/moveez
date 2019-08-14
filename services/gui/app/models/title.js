var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

//schema definition for title
var TitleSchema = new Schema({
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  seen: { type: Boolean, default: false },
  seenOn: { type: Date },
  poster: { type: String },
  imdbRating: { type: Number },
  imdbID: { type: String },
  year: { type: String },
  tomatoUserRating: { type: Number },
  tomatoURL: { type: String },
  user: { type: String }
});

module.exports = mongoose.model("title", TitleSchema);
