const router = require("express").Router(),
      passport = require("passport"),
      User = require("../models/user"),
      { printLog } = require("../utilities/helpers");

// Show login
router.get("/user/login", (req, res) => {
    res.render("user/login");
});

// Do login
router.post("/user/login", passport.authenticate("local", { 
        failureRedirect: "/user/login",
        failureFlash: true
    }), (req, res) => {
        printLog("User " + req.body.username + " was logged in.");
        // Retrieve the url to be returned to.
        const returnUrl = req.session.returnTo ? req.session.returnTo : "/parks";
        delete req.session.returnTo;

        req.flash("success", "Welcome back, " + req.body.username + "!")
        res.redirect(returnUrl);
});

// Do logout
router.get("/user/logout", (req, res) => {
    const username = req.user.username;
    req.logout();
    printLog("User " + username + " was logged out.");
    req.flash("success", "Goodbye, " + username + "!")
    res.redirect("/parks");
});

// Show signup
router.get("/user/signup", (req, res) => {
    res.render("user/signup");
});

// Do signup
router.post("/user/signup", (req, res) => {
    User.register(new User({ username: req.body.username }), req.body.password)
        .then(user => {
            printLog("User " + req.body.username + " was registered.");
            passport.authenticate('local')(req, res, () => {
                printLog("User " + req.body.username + " was logged in.");
                req.flash("success", "Welcome, " + req.body.username + "!")
                res.redirect('/parks');
            });
        })
        .catch(err => {
            printLog("Failed to register user " + req.body.username);
            printLog(err);
            req.flash("error", err.message)
            res.redirect("/user/signup");
        });
});

module.exports = router;