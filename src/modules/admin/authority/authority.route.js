const express = require("express");
const router = express.Router();

const AuthorityController = require("./authority.controller.js");
const validate = require("../../../shared/middleware/validate.js");
const {
  createAuthorityValidator,
  updateAuthorityValidator,
  authorityIdParamValidator,
  updateAuthorityIssuesValidator
} = require("./authority.validator.js");

router.get("/", AuthorityController.listAuthorities);

router.post(
  "/",
  createAuthorityValidator,
  validate,
  AuthorityController.createAuthority
);

router.patch(
  "/:authorityId",
  authorityIdParamValidator,
  updateAuthorityValidator,
  validate,
  AuthorityController.updateAuthority
);

router.delete(
  "/:authorityId",
  authorityIdParamValidator,
  validate,
  AuthorityController.deleteAuthority
);

// Nested routes for authority-issue mappings
router.get(
  "/:authorityId/issues",
  authorityIdParamValidator,
  validate,
  AuthorityController.getAuthorityIssues
);

router.patch(
  "/:authorityId/issues",
  authorityIdParamValidator,
  updateAuthorityIssuesValidator,
  validate,
  AuthorityController.updateAuthorityIssues
);

module.exports = router;

