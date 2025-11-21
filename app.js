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

app.set('trust proxy', true);

app.use(securityHeaders);

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

const allowedOrigins = process.env.FRONTEND_ORIGIN?.split(',').map(origin => origin.trim()) || ['http://localhost:5173'];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

app.use(apiLimiter);

const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
});

app.get("/", (req, res) => {
  res.json({ message: "API is running..." });
});

app.get("/api/csrf-token", csrfProtection, (req, res) => {
  res.json({ 
    success: true,
    csrfToken: req.csrfToken() 
  });
});

app.use("/api/auth", authRoutes);

const csrfMiddleware = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  return csrfProtection(req, res, next);
};

app.use("/api/admin", csrfMiddleware, adminRoutes);
app.use("/api/issues", csrfMiddleware, issueRoutes);

app.use(errorHandler);

module.exports = app;
