const router = require("express").Router(),
      Comment = require("../models/comment"),
      Park = require("../models/park"),
      { printLog, 
        handleGenericError, 
        getDisplayDate } = require("../utilities/helpers"),
      { checkCommentPermission, 
        isUserAuthenticated } = require("../utilities/middleware");

// INDEX route
router.get("/parks/:id/comments", async (req, res) => {
    try {
        const park = await Park.findById(req.params.id)
            .populate({
                path: "comments",
                // sorting the populated comments array to show the latest first (descending)
                options: {sort: {createdAt: -1}
            }});
        res.render("comments/index", {park: park, getDisplayDate: getDisplayDate});
    } catch (err) {
        handleGenericError(err, req, res);
    }
});

//  NEW route
router.get("/parks/:id/comments/new", isUserAuthenticated, async (req, res) => {
    try {
        const park = await Park.findById(req.params.id);
        res.render("comments/new", { park: park });
    } catch (err) {
        handleGenericError(err, req, res);
    }
});

// CREATE route
router.post("/parks/:id/comments", isUserAuthenticated, async (req, res) => {
    try {
        const park = await Park.findById(req.params.id);
        const comment = await Comment.create({
            text: req.body.comment,
            author: {
                userId: req.user._id,
                username: req.user.username
        }});

        // Add the new comment to the related park.
        park.comments.push(comment._id);
        park.save();
        
        res.redirect("/parks/" + park._id);
    } catch (err) {
        handleGenericError(err, req, res);
    }
});

//  EDIT route
router.get("/parks/:id/comments/:comment_id/edit", 
    isUserAuthenticated, 
    checkCommentPermission, 
    async (req, res) => {
        try {
            const park = await Park.findById(req.params.id);
            const comment = await Comment.findById(req.params.comment_id);
            res.render("comments/edit", { park: park, comment: comment });
        } catch (err) {
            handleGenericError(err, req, res);
        }
});

//  UPDATE route
router.put("/parks/:id/comments/:comment_id", 
    isUserAuthenticated, 
    checkCommentPermission, 
    async (req, res) => {
        try {
            await Comment.findOneAndUpdate({ _id: req.params.comment_id }, req.body.comment);
            res.redirect("/parks/" + req.params.id);
        } catch (err) {
            handleGenericError(err, req, res);
        }
});

//  DESTROY route
router.delete("/parks/:id/comments/:comment_id", 
    isUserAuthenticated, 
    checkCommentPermission, 
    async (req, res) => {
        try {
            // Delete the comment
            await Comment.findOneAndDelete({ _id: req.params.comment_id });
            // Delete the comment id from the park's comment array
            await Park.findOneAndUpdate({ _id: req.params.id }, { $pull: { comments: req.params.comment_id }});
            res.redirect("/parks/" + req.params.id);
        } catch (err) {
            handleGenericError(err, req, res);
        }
});


module.exports = router;