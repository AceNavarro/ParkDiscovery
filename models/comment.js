const mongoose = require("mongoose");

// Define the comment schema
const commentSchema = new mongoose.Schema({
    text: String,
    author: {
        userId: { type: mongoose.SchemaTypes.ObjectId, ref: "User" },
        username: String
    }
}, { timestamps: true });

// Create and export the comment model
module.exports = mongoose.model("Comment", commentSchema);