const { body, param } = require("express-validator");

exports.authorityUserIdParamValidator = [
  param("authorityUserId")
    .isInt({ min: 1 })
    .withMessage("authorityUserId must be numeric")
];

exports.createAuthorityUserValidator = [
  body("authorityId")
    .isInt({ min: 1 })
    .withMessage("authorityId is required"),
  body("userId")
    .isInt({ min: 1 })
    .withMessage("userId is required")
];

exports.updateAuthorityUserValidator = [
  body("authorityId")
    .isInt({ min: 1 })
    .withMessage("authorityId is required")
];

