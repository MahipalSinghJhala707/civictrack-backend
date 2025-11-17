const { body } = require("express-validator");

// Acceptable roles for login
const VALID_ROLES = ["citizen", "authority", "admin"];

exports.registerValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required"),

  body("email")
    .trim()
    .isEmail()
    .withMessage("A valid email address is required"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
];

exports.loginValidator = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("A valid email address is required"),

  body("password")
    .notEmpty()
    .withMessage("Password is required"),

  body("role")
    .optional() // frontend will send role, default(citizen)
    .custom((value) => {
      if (!VALID_ROLES.includes(value)) {
        throw new Error("Invalid role selected");
      }
      return true;
    })
];
