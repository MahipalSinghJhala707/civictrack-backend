const { body, param } = require("express-validator");

const STATUS_VALUES = ["reported", "in_progress", "resolved", "rejected"];

exports.createReportValidator = [
  body("title").trim().notEmpty().escape().withMessage("Title is required"),
  body("description").trim().notEmpty().escape().withMessage("Description is required"),
  body("issueId")
    .isInt({ min: 1 })
    .withMessage("A valid issue category is required"),
  body("region")
    .trim()
    .notEmpty()
    .withMessage("Region (zone) is required for authority assignment"),
  body("city")
    .trim()
    .notEmpty()
    .withMessage("City is required for authority assignment"),
  body("latitude")
    .optional({ values: "falsy" })
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),
  body("longitude")
    .optional({ values: "falsy" })
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),
  body("imageUrls")
    .optional({ values: "falsy" })
    .isArray({ max: 5 })
    .withMessage("imageUrls must be an array with up to 5 items"),
  body("imageUrls.*")
    .optional({ values: "falsy" })
    .isURL()
    .withMessage("Each image URL must be valid")
];

exports.updateStatusValidator = [
  param("reportId").isInt({ min: 1 }).withMessage("reportId must be numeric"),
  body("status")
    .isIn(STATUS_VALUES)
    .withMessage(`Status must be one of ${STATUS_VALUES.join(", ")}`),
  body("comment")
    .optional({ values: "falsy" })
    .isLength({ max: 1000 })
    .withMessage("Comment can be up to 1000 characters")
];

exports.flagReportValidator = [
  param("reportId").isInt({ min: 1 }).withMessage("reportId must be numeric"),
  body("flagId")
    .isInt({ min: 1 })
    .withMessage("Please provide a valid flag reason")
];

exports.toggleVisibilityValidator = [
  param("reportId").isInt({ min: 1 }).withMessage("reportId must be numeric"),
  body("isHidden")
    .isBoolean()
    .withMessage("isHidden must be a boolean value")
];

exports.reportIdParamValidator = [
  param("reportId").isInt({ min: 1 }).withMessage("reportId must be numeric")
];

