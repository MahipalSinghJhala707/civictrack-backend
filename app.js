const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const authRoutes = require("./src/modules/auth/auth.route.js");
const adminRoutes = require("./src/modules/admin/admin.route.js");
const issueRoutes = require("./src/modules/issue/issue.route.js");
const errorHandler = require("./src/shared/middleware/error.middleware.js");
const { securityHeaders, apiLimiter } = require("./src/shared/middleware/security.middleware.js");

const app = express();

app.set('trust proxy', trustProxy);

app.use(securityHeaders);

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

const allowedOrigins = process.env.FRONTEND_ORIGIN?.split(',').map(origin => origin.trim()) || ['http://localhost:5173'];
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      
      // In development, allow any localhost origin
      if (isDevelopment && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
        return callback(null, true);
      }
      
      // Check against allowed origins list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Log rejected origin for debugging
      console.warn(`CORS: Origin "${origin}" not allowed. Allowed origins:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

app.use(apiLimiter);

app.get("/", (req, res) => {
  res.json({ message: "API is running..." });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/issues", issueRoutes);

app.use(errorHandler);

module.exports = app;
