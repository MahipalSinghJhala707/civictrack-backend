const express = require("express");
const router = express.Router();

const AuthController = require("./auth.controller.js");
const authMiddleware = require("./auth.middleware.js");
const { registerValidator, loginValidator, changePasswordValidator } = require("./auth.validator.js");
const validate = require("../../shared/middleware/validate.js");
const { authLimiter } = require("../../shared/middleware/security.middleware.js");

router.post("/register", authLimiter, registerValidator, validate, AuthController.register);

router.post("/login", authLimiter, loginValidator, validate, AuthController.login);

router.post("/logout", authMiddleware, AuthController.logout);

router.get("/me", authMiddleware, AuthController.me);

router.patch("/change-password", authMiddleware, changePasswordValidator, validate, AuthController.changePassword);

module.exports = router;
