const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const authRoutes = require("./src/modules/auth/auth.route.js");
const errorHandler = require("./src/shared/middleware/error.middleware.js");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: true
  })
);

app.get("/", (req, res) => res.json({ message: "API is running..." }));

app.use("/api/auth", authRoutes);

app.use(errorHandler);

module.exports = app;
