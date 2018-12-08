const mongoose = require("mongoose");

var userSchema = new mongoose.Schema({ });
userSchema.plugin(require("passport-local-mongoose"));

module.exports = mongoose.model("User", userSchema);