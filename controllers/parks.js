const router = require("express").Router(),
      Park = require("../models/park"),
      Comment = require("../models/comment"),
      Review = require("../models/review"),
      { getDisplayDate, printLog, handleGenericError } = require("../utilities/helpers"),
      { checkParkPermission, isUserAuthenticated } = require("../utilities/middleware");


// ===== Setup Geocoder =======================================================
const geocoder = require('node-geocoder')({
    provider: 'google',
    httpAdapter: 'https',
    apiKey: process.env.GEOCODER_API_KEY,
    formatter: null
});


// ===== Setup Multer and Cloudinary (for image upload) =======================
const multer = require("multer");
const storage = multer.diskStorage({
    filename: (req, file, callback) => {
        callback(null, Date.now() + file.originalname);
    }
});
const imageFilter = (req, file, cb) => {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
const upload = multer({ 
    storage: storage, 
    fileFilter: imageFilter
});

const cloudinary = require("cloudinary");
cloudinary.config({ 
  cloud_name: 'cheezztouch', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


// ===== RESTful Routes =======================================================

// MAIN route
router.get("/", (req, res) => {
    res.render("landing");
});

// INDEX route
router.get("/parks", (req, res) => {
    if (req.query.search) {
        // Read all parks from database based on search keyword.
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Park.find({$or: [{name: regex,},
                        //  {location: regex}, 
                         {"author.username":regex}
            ]}).exec()
            .then(parks => {
                printLog("Retrieved filtered parks from database.");
                if (parks.length === 0) {
                    // If result is empty, need to redirect back to this page
                    // to properly show the flash message.
                    req.flash("error", "Your search did not match any park.");
                    return res.redirect("/parks");
                }
                res.render("parks/index", { parks: parks });
            }).catch(err => {
                printLog("ERROR: Failed to read from the database.");
                handleGenericError(err, req, res);
            });
    } else {
        if (req.query.search === "") {
            // If search is empty, need to redirect back to this route 
            // to clear-out the queries from the path.
            return res.redirect("/parks");
        }

        // Read all parks from database.
        Park.find({}).exec()
            .then(parks => {
                printLog("Retrieved parks from database.");
                res.render("parks/index", { parks: parks });
            }).catch(err => {
                printLog("ERROR: Failed to read from the database.");
                handleGenericError(err, req, res);
            });
    }
});

// NEW route
router.get("/parks/new", isUserAuthenticated, (req, res) => {
    res.render("parks/new");
});

// CREATE route
router.post("/parks", isUserAuthenticated,
    upload.single('image'), 
    (req, res) => {        
        // Check location using geocoder
        geocoder.geocode(req.body.location)
        .then(result => {
            printLog("Park location has been validated.");
            req.body.park.lat = result[0].latitude;
            req.body.park.lng = result[0].longitude;
            req.body.park.location = result[0].formattedAddress;

            // Upload image into cloudinary
            cloudinary.v2.uploader.upload(req.file.path)
                .then(result => {
                    printLog("Image has been uploaded to cloudinary.");
                        // Add cloudinary info for the image
                        req.body.park.image = result.secure_url;
                        req.body.park.imageId = result.public_id;
                        // Add user information
                        req.body.park.author = {
                            userId: req.user._id,
                            username: req.user.username
                        };
                        // Insert new park to database.
                        Park.create(req.body.park)
                            .then(park => {
                                printLog("Added new park to the database.");
                                // Redirect to the gallery page
                                res.redirect("/parks/" + park._id);
                            }).catch(err => {
                                printLog("ERROR: Failed to insert an item on the database.");
                                handleGenericError(err, req, res);
                            });
                }).catch(err => {
                    printLog("ERROR: Failed to upload the park image.");
                    printLog(err);
                    req.flash("error", "Ooops! The seems to be a problem while uploading the image. Please try again.");
                    res.redirect("back");
                });
        }).catch(err => {
            printLog("ERROR: Park location is invalid.");
            printLog(err);
            req.flash("error", "Please enter a valid location.");
            res.redirect("back");
        });
});

// SHOW route
router.get("/parks/:id", (req, res) => {
    Park.findById(req.params.id)
        .populate({
            path: "comments",
            // show the latest first (descending)
            options: {sort: {createdAt: -1}
        }})
        .populate({
            path: "reviews",
            // show the latest first (descending)
            options: {sort: {createdAt: -1}
        }}).exec()
        .then(park => {
            printLog("Retrieved park info from database.");
            res.render("parks/show", { park: park, getDisplayDate: getDisplayDate });
        }).catch(err => {
            printLog("ERROR: Failed to read from the database.");
            handleGenericError(err, req, res);
        });
});

// EDIT route
router.get("/parks/:id/edit", 
    isUserAuthenticated, 
    checkParkPermission, 
    (req, res) => {
        Park.findById(req.params.id).exec()
            .then(park => {
                printLog("Retrieved park info from database.");
                res.render("parks/edit", { park: park });
            }).catch(err => {
                printLog("ERROR: Failed to read from the database.");
                handleGenericError(err, req, res);
            });
});

// UPDATE route
router.put("/parks/:id", 
    isUserAuthenticated, 
    checkParkPermission,
    upload.single('image'), 
    (req, res) => {
        // Delete the rating property from this update because it not part of this scope.
        delete req.body.park.rating;

        // Check location using geocoder
        geocoder.geocode(req.body.location)
        .then(result => {
            printLog("Park location has been validated.");
            req.body.park.lat = result[0].latitude;
            req.body.park.lng = result[0].longitude;
            req.body.park.location = result[0].formattedAddress;

            // Update the park in database
            Park.findOneAndUpdate({ _id: req.params.id }, req.body.park).exec()
                .then(park => {
                    printLog("Updated park info from database.");

                    // Check if a new image file was uploaded
                    if (req.file) {
                        // Delete existing image
                        cloudinary.v2.uploader.destroy(park.imageId)
                            .then(result => {
                                printLog("Deleted existing park image before updating.");
    
                                // Upload the new image
                                cloudinary.v2.uploader.upload(req.file.path)
                                    .then(result => {
                                        printLog("Uploaded the modified park image.");
                                        try {
                                            // Update the image info on park model and saec
                                            park.image = result.secure_url;
                                            park.imageId = result.public_id;
                                            park.save();
                                            res.redirect("/parks/" + req.params.id)
                                        } catch (err) {
                                            printLog("ERROR: Failed to update park info on database.");
                                            handleGenericError(err, req, res);
                                        }
                                    }).catch(err => {
                                        printLog("ERROR: Failed to upload the updated park image.");
                                        printLog(err);
                                        req.flash("error", "Ooops! The seems to be a problem while updating the image. Please try again.");
                                        res.redirect("back");
                                    });
                            }).catch(err => {
                                printLog("ERROR: Failed to delete the existing park image before updating.");
                                printLog(err);
                                req.flash("error", "Ooops! The seems to be a problem while updating the image. Please try again.");
                                res.redirect("back");
                            });
                    } else {
                        res.redirect("/parks/" + req.params.id)
                    }
                }).catch(err => {
                    printLog("ERROR: Failed to update park info on database.");
                    handleGenericError(err, req, res);
                });
        }).catch(err => {
            printLog("Park location is invalid.");
            printLog(err);
            req.flash("error", "Please enter a valid location.");
            res.redirect("back");
        });
});

// DESTROY route
router.delete("/parks/:id", 
    isUserAuthenticated, 
    checkParkPermission, 
    (req, res) => {
        Park.findOneAndDelete({ _id: req.params.id }).exec()
            .then(park => {
                printLog("Deleted park info from database.");
                // Delete asociated comments
                Comment.deleteMany({ _id: { $in: park.comments }}).exec()
                    .then(result => {
                        printLog("Deleted park's associated comments from database.");
                    })
                    .catch(err => {
                        printLog("ERROR: Failed to delete park's associated comments on database.");
                        handleGenericError(err, req, res);
                    });
                // Delete associated review
                Review.deleteMany({ _id: { $in: park.reviews }}).exec()
                .then(result => {
                    printLog("Deleted park's associated reviews from database.");
                })
                .catch(err => {
                    printLog("ERROR: Failed to delete park's associated reviews on database.");
                    handleGenericError(err, req, res);
                });
                // Delete associated image from cloudinary
                cloudinary.v2.uploader.destroy(park.imageId)
                    .then(result => {
                        printLog("Deleted park's image on cloud.");
                    }).catch(err => {
                        printLog("ERROR: Failed to delete image on cloud for associated deleted park.");
                        handleGenericError(err, req, res);
                    })
                // Redirect back to gallery
                res.redirect("/parks");
            }).catch(err => {
                printLog("ERROR: Failed to delete park info on database.");
                handleGenericError(err, req, res);
            });
});

// Escapes a regex input string to make safe from external attacks.
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};


module.exports = router;