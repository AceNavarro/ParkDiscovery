const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
    rating: {
        type: Number,
        required: "Please provide a rating (1-5 stars).",
        min: 1,
        max: 5,
        // Adding validation to see if the entry is an integer
        validate: {
            validator: Number.isInteger,
            message: "{VALUE} is not an integer value."
        }
    },
    text: { type: String },
    author: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        username: String
    },
    park: { type: mongoose.Schema.Types.ObjectId, ref: "Park" }
}, {
    // if timestamps are set to true, mongoose assigns createdAt and updatedAt fields to your schema, the type assigned is Date.
    timestamps: true
});

module.exports = mongoose.model("Review", reviewSchema);