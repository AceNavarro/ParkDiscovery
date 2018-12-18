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
  cloud_name: 'parkdiscovery', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


// ===== RESTful Routes =======================================================

// MAIN route
router.get("/", (req, res) => {
    res.render("landing");
});

// INDEX route
router.get("/parks", async (req, res) => {
    try {
        if (req.query.search) {
            // Read all parks from database based on search keyword.
            const regex = new RegExp(escapeRegex(req.query.search), 'gi');   
            const parks = await Park.find({$or: [
                {name: regex,},
                {location: regex}, 
                {"author.username":regex}
            ]});
    
            if (!parks || parks.length === 0) {
                // If result is empty, need to redirect back to this page
                // to properly show the flash message.
                req.flash("error", "Your search did not match any park.");
                return res.redirect("/parks");
            }
            res.render("parks/index", { parks: parks });
        } else {
            if (req.query.search === "") {
                // If search is empty, need to redirect back to this route 
                // to clear-out the queries from the path.
                return res.redirect("/parks");
            }
    
            // Read all parks from database.
            const parks = await Park.find({});
            res.render("parks/index", { parks: parks });
        }
    } catch(err) {
        handleGenericError(err, req, res);
    }
});


// NEW route
router.get("/parks/new", isUserAuthenticated, (req, res) => {
    res.render("parks/new");
});

// CREATE route
router.post("/parks", isUserAuthenticated,
    upload.single('image'), 
    async (req, res) => {    
        try {
            // Check location using geocoder
            const geoResult = await geocoder.geocode(req.body.location);
            req.body.park.lat = geoResult[0].latitude;
            req.body.park.lng = geoResult[0].longitude;
            req.body.park.location = geoResult[0].formattedAddress;
        } catch(err) {
            req.flash("error", "Please enter a valid location.");
            return res.redirect("back");
        }

        try {
            // Upload image into cloudinary
            const uploadResult = await cloudinary.v2.uploader.upload(req.file.path);
            req.body.park.image = uploadResult.secure_url;
            req.body.park.imageId = uploadResult.public_id;
        } catch (err) {
            req.flash("error", "Ooops! The seems to be a problem while uploading the image. Please try again.");
            return res.redirect("back");
        }
        
        try {
            // Add user information
            req.body.park.author = {
                userId: req.user._id,
                username: req.user.username
            };
            // Insert new park to database.
            const park = await Park.create(req.body.park);
            // Redirect to the gallery page
            res.redirect("/parks/" + park._id);   
        } catch (err) {
            return handleGenericError(err, req, res);
        }
});


// SHOW route
router.get("/parks/:id", async (req, res) => {
    try {
        const park = await Park.findById(req.params.id)
            .populate({
                path: "comments",
                // show the latest first (descending)
                options: {sort: {createdAt: -1}
            }})
            .populate({
                path: "reviews",
                // show the latest first (descending)
                options: {sort: {createdAt: -1}
            }});
        res.render("parks/show", { park: park, getDisplayDate: getDisplayDate });
    } catch (err) {
        handleGenericError(err, req, res);
    }
});

// EDIT route
router.get("/parks/:id/edit", 
    isUserAuthenticated, 
    checkParkPermission, 
    async (req, res) => {
        try {
            const park = await Park.findById(req.params.id);
            res.render("parks/edit", { park: park });
        } catch (err) {
            handleGenericError(err, req, res);
        }
});

// UPDATE route
router.put("/parks/:id", 
    isUserAuthenticated, 
    checkParkPermission,
    upload.single('image'), 
    async (req, res) => {
        // Delete the rating property from this update because it not part of this scope.
        delete req.body.park.rating;
        
        try {
            // Check location using geocoder
            const geoResult = await geocoder.geocode(req.body.location);
            req.body.park.lat = geoResult[0].latitude;
            req.body.park.lng = geoResult[0].longitude;
            req.body.park.location = geoResult[0].formattedAddress;
        } catch (err) {
            req.flash("error", "Please enter a valid location.");
            res.redirect("back");
        }

        try {
            // Update park information
            var park = await Park.findOneAndUpdate({ _id: req.params.id }, req.body.park, { new: true });
        } catch (err) {
            handleGenericError(err, req, res);
        }

        if (!req.file) {
            // No uploaded new image
            return res.redirect("/parks/" + req.params.id)
        }

        try {
            // Delete existing image
            await cloudinary.v2.uploader.destroy(park.imageId);
            // Upload new image
            var uploadResult = await cloudinary.v2.uploader.upload(req.file.path)
            park.image = uploadResult.secure_url;
            park.imageId = uploadResult.public_id;
        } catch (err) {
            req.flash("error", "Ooops! The seems to be a problem while updating the image. Please try again.");
            res.redirect("back");
        }
        
        try {
            park.save();
            res.redirect("/parks/" + req.params.id)
        } catch (err) {
            handleGenericError(err, req, res);
        }
});

// DESTROY route
router.delete("/parks/:id", 
    isUserAuthenticated, 
    checkParkPermission, 
    async (req, res) => {
        try {
            // Delete park
            const park = await Park.findOneAndDelete({ _id: req.params.id });
            // Delete associated comments
            await Comment.deleteMany({ _id: { $in: park.comments }});
            // Delete associated review
            await Review.deleteMany({ _id: { $in: park.reviews }});
            // Delete associated image from cloudinary
            await cloudinary.v2.uploader.destroy(park.imageId);
            // Redirect back to gallery
            res.redirect("/parks");
        } catch (err) {
            handleGenericError(err, req, res);
        }
});

// Escapes a regex input string to make safe from external attacks.
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};


module.exports = router;