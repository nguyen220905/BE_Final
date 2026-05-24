const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  location: { type: String },
  description: { type: String },
  occupation: { type: String },

  login_name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

module.exports = mongoose.model.Users || mongoose.model("Users", userSchema);
