const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();


app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || true,
    credentials: true,
  })
);


app.get('/', (req, res) => res.json({ message: 'API is running...' }));


const authRoutes = require('./src/modules/auth/auth.route.js');
app.use('/api/auth', authRoutes);


const authMiddleware = require('./src/modules/auth/auth.middleware.js');
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ ok: true, user: req.user });
});

const { allowRoles } = require("./src/modules/auth/auth.roles.js");
app.get("/api/admin-test",
  authMiddleware,
  allowRoles("admin"),
  (req, res) => {
    res.json({ ok: true, message: "Admin access granted", user: req.user });
  }
);


module.exports = app;
