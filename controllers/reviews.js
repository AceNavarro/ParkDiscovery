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
router.get("/parks/:id/reviews", async (req, res) => {
    try {
        const park = await Park.findById(req.params.id)
            .populate({
                path: "reviews",
                // sorting the populated reviews array to show the latest first (descending)
                options: {sort: {createdAt: -1}
            }});
        res.render("reviews/index", {park: park, getDisplayDate: getDisplayDate});
    } catch (err) {
        handleGenericError(err, req, res);
    }
});

// NEW route
router.get("/parks/:id/reviews/new", 
    isUserAuthenticated, 
    checkReviewExistence, 
    async (req, res) => {
        try {
            const park = await Park.findById(req.params.id);
            res.render("reviews/new", {park: park});
        } catch (err) {
            handleGenericError(err, req, res);
        }
});

// CREATE route
router.post("/parks/:id/reviews", 
    isUserAuthenticated, 
    checkReviewExistence, 
    async (req, res) => {
        try {
            const park = await Park.findById(req.params.id).populate("reviews");

            // Prepare new review
            var newReview = req.body.review;
            newReview.author = { 
                userId: req.user._id,
                username: req.user.username
            };
            newReview.park = park._id;

            const review = await Review.create(req.body.review);

            // Add new review to the related park
            park.reviews.push(review);
            park.rating = calculateAverage(park.reviews);
            park.save();

            res.redirect('/parks/' + park._id);
        } catch (err) {
            handleGenericError(err, req, res);
        }
});

// EDIT route
router.get("/parks/:id/reviews/:review_id/edit",
    isUserAuthenticated,
    checkReviewPermission, 
    async (req, res) => {
        try {
            const park = await Park.findById(req.params.id);
            const review = await Review.findById(req.params.review_id);
            res.render("reviews/edit", {park: park, review: review});
        } catch (err) {
            handleGenericError(err, req, res);
        }
});

// UPDATE route
router.put("/parks/:id/reviews/:review_id", 
    isUserAuthenticated,
    checkReviewPermission, 
    async (req, res) => {
        try {
            const review = await Review.findByIdAndUpdate(req.params.review_id, req.body.review, { new: true });
            const park = await Park.findById(req.params.id).populate("reviews");

            // recalculate campground average
            park.rating = calculateAverage(park.reviews);
            park.save();
            
            res.redirect('/parks/' + park._id);
        } catch (err) {
            handleGenericError(err, req, res);
        }
});

// DESTROY route
router.delete("/parks/:id/reviews/:review_id", 
    isUserAuthenticated,
    checkReviewPermission, 
    async (req, res) => {
        try {
            await Review.findByIdAndRemove(req.params.review_id);
            const park = await Park.findOneAndUpdate({ _id: req.params.id }, { $pull: { reviews: req.params.review_id }}, {new: true}).populate("reviews");

            // recalculate campground average
            park.rating = calculateAverage(park.reviews);
            park.save();
            
            res.redirect("/parks/" + req.params.id);
        } catch (err) {
            handleGenericError(err, req, res);
        }
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