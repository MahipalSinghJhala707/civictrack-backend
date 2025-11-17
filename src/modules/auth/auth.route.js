const express = require("express");
const router = express.Router();

const AuthController = require("./auth.controller.js");

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/logout", AuthController.logout);

module.exports = router;
