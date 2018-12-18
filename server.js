require('dotenv').config()

const express = require("express"),
      app = express(),
      mongoose = require("mongoose"),
      passport = require("passport"),
      flash = require("connect-flash"),
      { printLog } = require("./utilities/helpers"),
      { addUserToLocals, addFlashMessagesToLocals } = require("./utilities/middleware");


// ===== DATABASE =============================================================
// Connect to the database.
mongoose.connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: true
    }).then(() => {
        printLog("Connection to database has been established.");
    }).catch(err => {
        printLog("ERROR: Failed to connect to the database.");
        printLog(err);
        // TODO: show error to client
    });
mongoose.set('useCreateIndex', true);


// ===== APP SERVER SETUP =====================================================
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
app.use(require("method-override")("_method"));


// ===== PASSPORT SETUP =======================================================
const User = require("./models/user");
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(require("express-session")({
    secret: "+#3_qU!cK_bR0wN_f0X",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(addUserToLocals);


// ===== FLASH SETUP ==========================================================
app.use(flash()); //must be declared after the session
app.use(addFlashMessagesToLocals);


// ===== ROUTES SETUP =========================================================
app.use(require("./controllers/auth"));
app.use(require("./controllers/parks"));
app.use(require("./controllers/comments"));
app.use(require("./controllers/reviews"));


// ===== LISTEN ================================================================
app.listen(process.env.PORT, () => {
    printLog("The Park Discovery server is started.");
});