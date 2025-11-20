const { body, param } = require("express-validator");

exports.authorityIdParamValidator = [
  param("authorityId")
    .isInt({ min: 1 })
    .withMessage("authorityId must be numeric")
];

exports.createAuthorityValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("city").trim().notEmpty().withMessage("City is required"),
  body("region").trim().notEmpty().withMessage("Region is required"),
  body("departmentId")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("departmentId must be numeric"),
  body("address")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Address can be up to 1000 characters")
];

exports.updateAuthorityValidator = [
  body("name")
    .optional({ values: "falsy" })
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty"),
  body("city")
    .optional({ values: "falsy" })
    .trim()
    .notEmpty()
    .withMessage("City cannot be empty"),
  body("region")
    .optional({ values: "falsy" })
    .trim()
    .notEmpty()
    .withMessage("Region cannot be empty"),
  body("departmentId")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("departmentId must be numeric"),
  body("address")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Address can be up to 1000 characters"),
  body().custom((value, { req }) => {
    if (
      !req.body.name &&
      !req.body.city &&
      !req.body.region &&
      !req.body.departmentId &&
      !req.body.address
    ) {
      throw new Error("Provide at least one field to update.");
    }
    return true;
  })
];

exports.updateAuthorityIssuesValidator = [
  body("issueIds")
    .optional({ values: "falsy" })
    .isArray()
    .withMessage("issueIds must be an array"),
  body("issueIds.*")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("Each issue ID must be a positive integer")
];

