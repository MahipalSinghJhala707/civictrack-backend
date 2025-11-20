const express = require("express");
const router = express.Router();

const AuthorityUserController = require("./authorityUser.controller.js");
const validate = require("../../../shared/middleware/validate.js");
const {
  authorityUserIdParamValidator,
  createAuthorityUserValidator,
  updateAuthorityUserValidator
} = require("./authorityUser.validator.js");

router.get("/", AuthorityUserController.listAuthorityUsers);

router.post(
  "/",
  createAuthorityUserValidator,
  validate,
  AuthorityUserController.createAuthorityUser
);

router.patch(
  "/:authorityUserId",
  authorityUserIdParamValidator,
  updateAuthorityUserValidator,
  validate,
  AuthorityUserController.updateAuthorityUser
);

router.delete(
  "/:authorityUserId",
  authorityUserIdParamValidator,
  validate,
  AuthorityUserController.deleteAuthorityUser
);

module.exports = router;

