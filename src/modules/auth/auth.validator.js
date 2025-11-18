const { body } = require("express-validator");

const VALID_ROLES = ["citizen", "authority", "admin"];

exports.registerValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").trim().isEmail().withMessage("A valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
];

exports.loginValidator = [
  body("email").trim().isEmail().withMessage("A valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
  body("role")
    .optional()
    .custom((value) => {
      if (!VALID_ROLES.includes(value)) {
        throw new Error("Invalid role selected");
      }
      return true;
    })
];

