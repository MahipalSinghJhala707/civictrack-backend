const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const csrf = require('csurf');

const authRoutes = require("./src/modules/auth/auth.route.js");
const adminRoutes = require("./src/modules/admin/admin.route.js");
const issueRoutes = require("./src/modules/issue/issue.route.js");
const errorHandler = require("./src/shared/middleware/error.middleware.js");
const { securityHeaders, apiLimiter } = require("./src/shared/middleware/security.middleware.js");

const app = express();

app.use(securityHeaders);

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

const allowedOrigins = process.env.FRONTEND_ORIGIN?.split(',').map(origin => origin.trim()) || ['http://localhost:5173'];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  })
);

app.use(apiLimiter);

const csrfProtection = csrf({ cookie: true });

app.get("/", (req, res) => {
  res.json({ message: "API is running..." });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", csrfProtection, adminRoutes);
app.use("/api/issues", csrfProtection, issueRoutes);

app.use(errorHandler);

module.exports = app;
