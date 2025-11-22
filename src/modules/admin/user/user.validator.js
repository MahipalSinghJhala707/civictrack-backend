const { body, param } = require("express-validator");

exports.userIdParamValidator = [
  param("userId").isInt({ min: 1 }).withMessage("userId must be numeric")
];

exports.createUserValidator = [
  body("name").trim().notEmpty().escape().withMessage("Name is required"),
  body("email").trim().isEmail().withMessage("A valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("roleIds")
    .optional({ values: "falsy" })
    .isArray()
    .withMessage("roleIds must be an array"),
  body("roleIds.*")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("roleIds must contain numeric ids")
];

exports.updateUserValidator = [
  body("name")
    .optional({ values: "falsy" })
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty"),
  body("email")
    .optional({ values: "falsy" })
    .trim()
    .isEmail()
    .withMessage("A valid email is required"),
  body().custom((value, { req }) => {
    if (!req.body.name && !req.body.email) {
      throw new Error("Provide at least one field to update.");
    }
    return true;
  })
];

exports.updateUserRolesValidator = [
  body("roleIds")
    .isArray({ min: 1 })
    .withMessage("roleIds must be a non-empty array"),
  body("roleIds.*")
    .isInt({ min: 1 })
    .withMessage("roleIds must contain numeric ids")
];

exports.changeUserPasswordValidator = [
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number")
];

