const express = require("express");
const router = express.Router();

const AuthController = require("./auth.controller.js");
const authMiddleware = require("./auth.middleware.js");
const { allowRoles } = require("./auth.roles.js");
const { registerValidator, loginValidator } = require("./auth.validator.js");
const validate = require("../../shared/middleware/validate.js");

router.post(
  "/register",
  registerValidator,
  validate,
  AuthController.register
);

router.post(
  "/login",
  loginValidator,
  validate,
  AuthController.login
);


router.post(
  "/logout",
  authMiddleware,
  AuthController.logout
);

router.get(
  "/me",
  authMiddleware,
  AuthController.me
);


router.get(
  "/admin-test",
  authMiddleware,
  allowRoles("admin"),
  (req, res) => {
    res.json({
      message: "Admin access granted",
      user: req.user,
    });
  }
);

module.exports = router;
