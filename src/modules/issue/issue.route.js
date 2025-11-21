const express = require("express");
const router = express.Router();

const IssueController = require("./issue.controller.js");
const authMiddleware = require("../auth/auth.middleware.js");
const { allowRoles } = require("../auth/auth.roles.js");
const validate = require("../../shared/middleware/validate.js");
const { uploadReportImages } = require("./issue.middleware.js");
const {
  createReportValidator,
  updateStatusValidator,
  flagReportValidator,
  toggleVisibilityValidator,
  reportIdParamValidator
} = require("./issue.validator.js");

// Public routes - no authentication required
router.get("/categories", IssueController.listCategories);
router.get("/flags", IssueController.listFlags);

// All other routes require authentication
router.use(authMiddleware);

router.post(
  "/reports",
  allowRoles("citizen"),
  uploadReportImages,
  createReportValidator,
  validate,
  IssueController.createReport
);

router.get("/reports", IssueController.listReports);

router.get(
  "/reports/flagged",
  allowRoles("admin"),
  IssueController.listFlaggedReports
);

router.get(
  "/reports/:reportId",
  reportIdParamValidator,
  validate,
  IssueController.getReportById
);

router.patch(
  "/reports/:reportId/status",
  allowRoles("authority", "admin"),
  updateStatusValidator,
  validate,
  IssueController.updateStatus
);

router.post(
  "/reports/:reportId/flag",
  allowRoles("citizen"),
  flagReportValidator,
  validate,
  IssueController.flagReport
);

router.patch(
  "/reports/:reportId/visibility",
  allowRoles("admin"),
  toggleVisibilityValidator,
  validate,
  IssueController.toggleReportVisibility
);

module.exports = router;
