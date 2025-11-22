const express = require("express");
const router = express.Router();

const UserController = require("./user.controller.js");
const validate = require("../../../shared/middleware/validate.js");
const {
  createUserValidator,
  updateUserValidator,
  updateUserRolesValidator,
  userIdParamValidator,
  changeUserPasswordValidator
} = require("./user.validator.js");

router.get("/", UserController.listUsers);

router.post(
  "/",
  createUserValidator,
  validate,
  UserController.createUser
);

router.patch(
  "/:userId",
  userIdParamValidator,
  updateUserValidator,
  validate,
  UserController.updateUser
);

router.patch(
  "/:userId/roles",
  userIdParamValidator,
  updateUserRolesValidator,
  validate,
  UserController.updateUserRoles
);

router.patch(
  "/:userId/password",
  userIdParamValidator,
  changeUserPasswordValidator,
  validate,
  UserController.changeUserPassword
);

router.delete(
  "/:userId",
  userIdParamValidator,
  validate,
  UserController.deleteUser
);

module.exports = router;

