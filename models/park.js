const mongoose = require("mongoose");

// Define the park schema.
const parkSchema = new mongoose.Schema({
    name: String,
    image: String,
    imageId: String,
    description: String,
    location: String,
    lat: Number,
    lng: Number,
    comments: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Comment" }],
    author: {
        userId: { type: mongoose.SchemaTypes.ObjectId, ref: "User" },
        username: String
    },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    rating: { type: Number, default: 0 }
});

// Create and export the park model.
module.exports = mongoose.model("Park", parkSchema);