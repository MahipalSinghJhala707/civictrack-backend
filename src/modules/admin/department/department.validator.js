const { body, param } = require("express-validator");

exports.departmentIdParamValidator = [
  param("departmentId")
    .isInt({ min: 1 })
    .withMessage("departmentId must be numeric")
];

exports.createDepartmentValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("description")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description can be up to 500 characters")
];

exports.updateDepartmentValidator = [
  body("name")
    .optional({ values: "falsy" })
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty"),
  body("description")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description can be up to 500 characters"),
  body().custom((value, { req }) => {
    if (!req.body.name && !req.body.description) {
      throw new Error("Provide at least one field to update.");
    }
    return true;
  })
];

