const Park = require("../models/park"),
      Comment = require("../models/comment"),
      Review = require("../models/review"),
      { printLog, handleGenericError } = require("../utilities/helpers");

// Add the authenticated user to response locals
function addUserToLocals(req, res, next) {
    res.locals.user = req.user;
    next();
}

// Add the flash message to response locals
function addFlashMessagesToLocals(req, res, next) {
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    res.locals.info = req.flash("info");
    next();
}

// Checks if there is an authenticated user on the current session.
function isUserAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    // Store the url before login page was shown
    req.session.returnTo = req.originalUrl;
    // Message when an action fails because user need to be logged-in
    req.flash("error", "Please login to proceed.")
    // Redirect to login page if user is not authenticated
    res.redirect("/user/login");
}

// Checks if the user has permission for a specific park.
function checkParkPermission(req, res, next) {
    Park.findById(req.params.id).exec()
        .then(park => {
            if (req.user && park.author.userId.equals(req.user._id)) {
                return next();
            } else {
                // Forbidden
                res.sendStatus(403);
            }
        })
        .catch(err => {
            printLog("Failed to retrieve park info from database.");
            handleGenericError(err, req, res);
        });
}

// Checks if the user has permission for a specific comment.
function checkCommentPermission(req, res, next) {
    Comment.findById(req.params.comment_id).exec()
        .then(comment => {
            if (req.user && comment.author.userId.equals(req.user._id)) {
                return next();
            } else {
                // Forbidden
                res.sendStatus(403);
            }
        })
        .catch(err => {
            printLog("Failed to retrieve comment from database.");
            handleGenericError(err, req, res);
        });
}

// Checks if the user has permission for a specific review.
function checkReviewPermission(req, res, next) {
    Review.findById(req.params.review_id).exec()
        .then(review => {
            if (req.user && review.author.userId.equals(req.user._id)) {
                return next();
            } else {
                // Forbidden
                res.sendStatus(403);
            }
        })
        .catch(err => {
            printLog("Failed to retrieve review from database.");
            handleGenericError(err, req, res);
        });
}

// Checks if a user already reviewed the campground, only one review per user is allowed
function checkReviewExistence(req, res, next) {
    Park.findById(req.params.id)
        .populate("reviews").exec()
        .then(park => {
            // Check if the user has already reviewed the park
            var foundUserReview = park.reviews.some(review => {
                return req.user && review.author.userId.equals(req.user._id);
            });
            if (foundUserReview) {
                req.flash("error", "You have already reviewed this park.");
                return res.redirect("/parks/" + park._id);
            }
            // If review was not found, go to the next middleware
            next();

        }).catch(err => {
            printLog("Failed to retrieve park info from database.");
            handleGenericError(err, req, res); 
        });
}


exports.addUserToLocals = addUserToLocals;
exports.addFlashMessagesToLocals = addFlashMessagesToLocals;
exports.isUserAuthenticated = isUserAuthenticated;
exports.checkParkPermission = checkParkPermission;
exports.checkCommentPermission = checkCommentPermission;
exports.checkReviewPermission = checkReviewPermission;
exports.checkReviewExistence = checkReviewExistence;