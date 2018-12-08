const moment = require("moment");
moment().format();

// Gets a display value for a Date object
function getDisplayDate(date) {
    return moment(date).fromNow();
}

// Prints a message into the console with date and time
function printLog(msg) {
    console.log("[" + moment().format("llll") + "] " + msg);
}

// Handles generic error from route handlers
function handleGenericError(err, req, res) {
    printLog(err);

    var errorMessage = "Sorry. Looks like something went wrong on our end. Thanks for your patience while we put the pieces back together.";
    if (err && err.message) {
        errorMessage = err.message;
    }

    req.flash("error", errorMessage)
    res.redirect("/");
    // For improvement: create and show an error page
}

exports.getDisplayDate = getDisplayDate;
exports.printLog = printLog;
exports.handleGenericError = handleGenericError;