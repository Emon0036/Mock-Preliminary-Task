require("dotenv").config({ quiet: true });

const path = require("path");
const express = require("express");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const mongoose = require("mongoose");
const passport = require("passport");
const User = require("./models/User");

const app = express();
const port = process.env.PORT || 8080;
const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  (process.env.NODE_ENV === "production" ? "" : "mongodb://127.0.0.1:27017/test");

if (!mongoUri) {
  throw new Error("MONGODB_URI is required when NODE_ENV=production");
}

const sessionSecret =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "development-only-session-secret");

if (!sessionSecret) {
  throw new Error("SESSION_SECRET is required when NODE_ENV=production");
}

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    name: "mock_preliminary.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUri,
      collectionName: "sessions",
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.SESSION_SECURE_COOKIE === undefined
          ? process.env.NODE_ENV === "production"
          : process.env.SESSION_SECURE_COOKIE === "true",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

function requireLogin(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  return res.redirect("/login?message=Please log in first.");
}

function redirectIfLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/dashboard");
  }

  return next();
}

app.get("/", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];

  res.render("index", {
    title: "Home",
    database: states[mongoose.connection.readyState] || "unknown",
  });
});

app.get("/register", redirectIfLoggedIn, (req, res) => {
  res.render("register", {
    title: "Register",
    error: null,
    form: {},
  });
});

app.post("/register", redirectIfLoggedIn, async (req, res, next) => {
  const username = String(req.body.username || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!username || !email || !password) {
    return res.status(400).render("register", {
      title: "Register",
      error: "Username, email, and password are required.",
      form: { username, email },
    });
  }

  if (password.length < 6) {
    return res.status(400).render("register", {
      title: "Register",
      error: "Password must be at least 6 characters.",
      form: { username, email },
    });
  }

  try {
    const existingEmail = await User.findOne({ email });

    if (existingEmail) {
      return res.status(409).render("register", {
        title: "Register",
        error: "That email is already registered.",
        form: { username, email },
      });
    }

    const user = await User.register(new User({ username, email }), password);

    req.login(user, (error) => {
      if (error) {
        return next(error);
      }

      return res.redirect("/dashboard");
    });
  } catch (error) {
    return res.status(400).render("register", {
      title: "Register",
      error: error.message || "Registration failed.",
      form: { username, email },
    });
  }
});

app.get("/login", redirectIfLoggedIn, (req, res) => {
  res.render("login", {
    title: "Login",
    error: null,
    message: req.query.message,
    form: {},
  });
});

app.post("/login", redirectIfLoggedIn, (req, res, next) => {
  passport.authenticate("local", (error, user, info) => {
    if (error) {
      return next(error);
    }

    if (!user) {
      return res.status(401).render("login", {
        title: "Login",
        error: info?.message || "Invalid username or password.",
        message: null,
        form: { username: req.body.username },
      });
    }

    return req.login(user, (loginError) => {
      if (loginError) {
        return next(loginError);
      }

      return res.redirect("/dashboard");
    });
  })(req, res, next);
});

app.get("/dashboard", requireLogin, (req, res) => {
  res.render("dashboard", {
    title: "Dashboard",
  });
});

app.post("/logout", requireLogin, (req, res, next) => {
  req.logout((error) => {
    if (error) {
      return next(error);
    }

    return res.redirect("/login?message=You are logged out.");
  });
});

app.get("/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const database = states[mongoose.connection.readyState] || "unknown";
  const healthy = mongoose.connection.readyState === 1;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    database,
  });
});

app.use((req, res) => {
  res.status(404).render("error", {
    title: "Not Found",
    message: "Page not found.",
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).render("error", {
    title: "Server Error",
    message: "Something went wrong.",
  });
});

let server;
let shuttingDown = false;

async function startServer() {
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");

  server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`${signal} received. Closing server and MongoDB connection.`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Graceful shutdown failed", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
