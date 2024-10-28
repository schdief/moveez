const { Sequelize, DataTypes } = require("sequelize");
const sequelize = new Sequelize(process.env.DATABASE_URL);

const Title = sequelize.define("Title", {
  name: { type: DataTypes.STRING, allowNull: false },
  createdAt: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
  seen: { type: DataTypes.BOOLEAN, defaultValue: false },
  seenOn: { type: DataTypes.DATE },
  poster: { type: DataTypes.STRING },
  imdbRating: { type: DataTypes.FLOAT },
  imdbID: { type: DataTypes.STRING },
  year: { type: DataTypes.STRING },
  tomatoUserRating: { type: DataTypes.FLOAT },
  tomatoURL: { type: DataTypes.STRING },
  user: { type: DataTypes.STRING },
  genres: { type: DataTypes.ARRAY(DataTypes.STRING) }
});

module.exports = { Title };
