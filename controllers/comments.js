const router = require("express").Router(),
      Comment = require("../models/comment"),
      Park = require("../models/park"),
      { printLog, 
        handleGenericError, 
        getDisplayDate } = require("../utilities/helpers"),
      { checkCommentPermission, 
        isUserAuthenticated } = require("../utilities/middleware");

// INDEX route
router.get("/parks/:id/comments", (req, res) => {
    Park.findById(req.params.id)
        .populate({
            path: "comments",
            // sorting the populated comments array to show the latest first (descending)
            options: {sort: {createdAt: -1}
        }}).exec()
        .then(park => {
            printLog("Retrieved comments from database.");
            res.render("comments/index", {park: park, getDisplayDate: getDisplayDate});
        }).catch(err => {
            printLog("ERROR: Failed to read park and comments from the database.");
            handleGenericError(err, req, res);
        });
});

//  NEW route
router.get("/parks/:id/comments/new", isUserAuthenticated, (req, res) => {
    Park.findById(req.params.id).exec()
        .then(park => {
            printLog("Retrieved park info from database.");
            res.render("comments/new", { park: park });
        }).catch(err => {
            printLog("ERROR: Failed to read park from the database.");
            handleGenericError(err, req, res);
        });
});

// CREATE route
router.post("/parks/:id/comments", isUserAuthenticated, (req, res) => {
    // Find the Park related to the new comment
    Park.findById(req.params.id).exec()
        .then(park => {
            printLog("Retrieved park info from database.");
            // Insert new comment to database.
            Comment.create({
                text: req.body.comment,
                author: {
                    userId: req.user._id,
                    username: req.user.username
            }}).then(comment => {
                printLog("Added new comment to the database.");
                try {
                    // Add the new comment to the related park.
                    park.comments.push(comment._id);
                    park.save();
                    printLog("Linked new comment to the related park.");
                    res.redirect("/parks/" + park._id);
                } catch (err) {
                    handleGenericError(err, req, res);
                }
            }).catch(err => {
                printLog("ERROR: Failed to add a new comment to the database.");
                handleGenericError(err, req, res);
            });
        }).catch(err => {
            printLog("ERROR: Failed to read park from database.");
            handleGenericError(err, req, res);
    });
});

//  EDIT route
router.get("/parks/:id/comments/:comment_id/edit", 
    isUserAuthenticated, 
    checkCommentPermission, 
    (req, res) => {
        // Find the parent park of the comment
        Park.findById(req.params.id).exec()
            .then(park => {
                printLog("Retrieved park info from database.");
                // Find the comment
                Comment.findById(req.params.comment_id).exec()
                    .then(comment => {
                        printLog("Retrieved comment from database.");
                        res.render("comments/edit", { park: park, comment: comment });
                    })
                    .catch(err => {
                        printLog("ERROR: Failed to read comment from the database.");
                        handleGenericError(err, req, res);
                    });
            }).catch(err => {
                printLog("ERROR: Failed to read park from the database.");
                phandleGenericError(err, req, res);
            });
});

//  UPDATE route
router.put("/parks/:id/comments/:comment_id", 
    isUserAuthenticated, 
    checkCommentPermission, 
    (req, res) => {
        Comment.findOneAndUpdate({ _id: req.params.comment_id }, req.body.comment).exec()
            .then(comment => {
                printLog("Updated comment info from database.");
                res.redirect("/parks/" + req.params.id)
            }).catch(err => {
                printLog("ERROR: Failed to update comment from the database.");
                handleGenericError(err, req, res);
            });
});

//  DESTROY route
router.delete("/parks/:id/comments/:comment_id", 
    isUserAuthenticated, 
    checkCommentPermission, 
    (req, res) => {
        // Delete the comment
        Comment.findOneAndDelete({ _id: req.params.comment_id }).exec()
            .then(comment => {
                printLog("Deleted comment from database.");
                // Delete the comment id from the park's comment array
                Park.findOneAndUpdate({ _id: req.params.id }, { $pull: { comments: req.params.comment_id }}).exec()
                    .then(park => {
                        printLog("Removed linkage of comment from its parent park.");
                        res.redirect("/parks/" + req.params.id);
                    })
                    .catch(err => {
                        printLog("ERROR: Failed to update park info from the database.");
                        handleGenericError(err, req, res);
                    });
            }).catch(err => {
                printLog("ERROR: Failed to delete comment from the database.");
                handleGenericError(err, req, res);
            });
});


module.exports = router;