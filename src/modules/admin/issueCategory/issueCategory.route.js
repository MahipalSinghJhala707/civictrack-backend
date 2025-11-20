const express = require("express");
const router = express.Router();

const IssueCategoryController = require("./issueCategory.controller.js");
const validate = require("../../../shared/middleware/validate.js");
const {
  categoryIdParamValidator,
  createIssueCategoryValidator,
  updateIssueCategoryValidator
} = require("./issueCategory.validator.js");

router.get("/", IssueCategoryController.listIssueCategories);

router.post(
  "/",
  createIssueCategoryValidator,
  validate,
  IssueCategoryController.createIssueCategory
);

router.patch(
  "/:categoryId",
  categoryIdParamValidator,
  updateIssueCategoryValidator,
  validate,
  IssueCategoryController.updateIssueCategory
);

router.delete(
  "/:categoryId",
  categoryIdParamValidator,
  validate,
  IssueCategoryController.deleteIssueCategory
);

module.exports = router;

