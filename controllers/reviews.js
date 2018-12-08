const router = require("express").Router(),
      Park = require("../models/park"),
      Review = require("../models/review"),
      { printLog, 
        handleGenericError,
        getDisplayDate } = require("../utilities/helpers"),
      { isUserAuthenticated, 
        checkReviewExistence, 
        checkReviewPermission } = require("../utilities/middleware");


// INDEX route
router.get("/parks/:id/reviews", (req, res) => {
    Park.findById(req.params.id)
        .populate({
            path: "reviews",
            // sorting the populated reviews array to show the latest first (descending)
            options: {sort: {createdAt: -1}
        }}).exec()
        .then(park => {
            printLog("Retrieved reviews from database.");
            res.render("reviews/index", {park: park, getDisplayDate: getDisplayDate});
        }).catch(err => {
            printLog("ERROR: Failed to read park and reviews from the database.");
            handleGenericError(err, req, res);
        });
});

// NEW route
router.get("/parks/:id/reviews/new", 
    isUserAuthenticated, 
    checkReviewExistence, 
    (req, res) => {
        Park.findById(req.params.id).exec()
            .then(park => {
                printLog("Retrieved park info from database.");
                res.render("reviews/new", {park: park});
            }).catch(err => {
                printLog("ERROR: Failed to read park from the database.");
                handleGenericError(err, req, res);
            });
});

// CREATE route
router.post("/parks/:id/reviews", 
    isUserAuthenticated, 
    checkReviewExistence, 
    (req, res) => {
        Park.findById(req.params.id)
            .populate("reviews").exec()
            .then(park => {
                printLog("Retrieved park info from database.");
                // Prepare new review
                var newReview = req.body.review;
                newReview.author = { 
                    userId: req.user._id,
                    username: req.user.username
                };
                newReview.park = park._id;

                // Add new review to the database
                Review.create(req.body.review)
                    .then(review => {
                        printLog("Added new review to the database.");
                        try {
                            // Add new review to the related park
                            park.reviews.push(review);
                            // Calculate the new average review for the park
                            park.rating = calculateAverage(park.reviews);
                            park.save();
                            printLog("Linked new review to the related park.");
                            res.redirect('/parks/' + park._id);
                        } catch (err) {
                            handleGenericError(err, req, res);
                        }
                    }).catch(err => {
                        printLog("ERROR: Failed to add new review to the database.");
                        handleGenericError(err, req, res);
                    });

            }).catch(err => {
                printLog("ERROR: Failed to read park from the database.");
                handleGenericError(err, req, res);
            });
});

// EDIT route
router.get("/parks/:id/reviews/:review_id/edit",
    isUserAuthenticated,
    checkReviewPermission, 
    (req, res) => {
        // Find the parent park of the comment
        Park.findById(req.params.id).exec()
            .then(park => {
                printLog("Retrieved park info from database.");
                // Find the review
                Review.findById(req.params.review_id).exec()
                    .then(review => {
                        printLog("Retrieved review from database.");
                        res.render("reviews/edit", {park: park, review: review});
                    }).catch(err => {
                        rintLog("ERROR: Failed to read review from the database.");
                        handleGenericError(err, req, res);
                    });
            }).catch(err => {
                printLog("ERROR: Failed to read park from the database.");
                phandleGenericError(err, req, res);
            });

        
});

// UPDATE route
router.put("/parks/:id/reviews/:review_id", 
    isUserAuthenticated,
    checkReviewPermission, 
    (req, res) => {
        Review.findByIdAndUpdate(req.params.review_id, req.body.review).exec()
            .then(review => {
                printLog("Updated review from database.");
                Park.findById(req.params.id)
                    .populate("reviews").exec()
                    .then(park => {
                        printLog("Retrieved park info from database.");
                        try {
                            // recalculate campground average
                            park.rating = calculateAverage(park.reviews);
                            park.save();
                            printLog("Updated park info from database.");
                            res.redirect('/parks/' + park._id);
                        } catch(err) {
                            handleGenericError(err, req, res);
                        }
                    }).catch(err => {
                        printLog("ERROR: Failed to read park from the database.");
                        handleGenericError(err, req, res);
                    });
            }).catch(err => {
                printLog("ERROR: Failed to update review from the database.");
                handleGenericError(err, req, res);
            });
});

// DESTROY route
router.delete("/parks/:id/reviews/:review_id", 
    isUserAuthenticated,
    checkReviewPermission, 
    (req, res) => {
        Review.findByIdAndRemove(req.params.review_id).exec()
            .then(review => {
                printLog("Deleted review from database.");
                Park.findOneAndUpdate({ _id: req.params.id }, { $pull: { reviews: req.params.review_id }}, {new: true})
                    .populate("reviews").exec()
                    .then(park => {
                        printLog("Removed linkage of comment from its parent park.");
                        try {
                            // recalculate campground average
                            park.rating = calculateAverage(park.reviews);
                            park.save();
                            printLog("Updated park info from database.");
                            res.redirect("/parks/" + req.params.id);
                        } catch(err) {
                            handleGenericError(err, req, res);
                        }
                    }).catch(err => {
                        printLog("ERROR: Failed to update park info from the database.");
                        handleGenericError(err, req, res);
                    });
            }).catch(err => {
                printLog("ERROR: Failed to delete review from the database.");
                handleGenericError(err, req, res);
            });
});


// Calculates the average rating of a park
function calculateAverage(reviews) {
    if (!reviews || reviews.length === 0) {
        return 0;
    }
    var sum = 0;
    reviews.forEach(item => {
        sum += item.rating;
    });
    return sum / reviews.length;
}


module.exports = router;