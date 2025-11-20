const express = require("express");
const router = express.Router();

const DepartmentController = require("./department.controller.js");
const validate = require("../../../shared/middleware/validate.js");
const {
  createDepartmentValidator,
  updateDepartmentValidator,
  departmentIdParamValidator
} = require("./department.validator.js");

router.get("/", DepartmentController.listDepartments);

router.post(
  "/",
  createDepartmentValidator,
  validate,
  DepartmentController.createDepartment
);

router.patch(
  "/:departmentId",
  departmentIdParamValidator,
  updateDepartmentValidator,
  validate,
  DepartmentController.updateDepartment
);

router.delete(
  "/:departmentId",
  departmentIdParamValidator,
  validate,
  DepartmentController.deleteDepartment
);

module.exports = router;

