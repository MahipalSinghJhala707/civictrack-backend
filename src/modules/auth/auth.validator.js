const { body } = require("express-validator");

const VALID_ROLES = ["citizen", "authority", "admin"];

exports.registerValidator = [
  body("name").trim().notEmpty().escape().withMessage("Name is required"),
  body("email").trim().isEmail().withMessage("A valid email is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number")
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

exports.changePasswordValidator = [
  body("oldPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number")
];

