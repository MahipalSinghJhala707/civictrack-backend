const DepartmentService = require("./department.service.js");

module.exports = {
  async listDepartments(req, res, next) {
    try {
      const departments = await DepartmentService.listDepartments();
      res.status(200).json({
        success: true,
        data: { departments }
      });
    } catch (err) {
      next(err);
    }
  },

  async createDepartment(req, res, next) {
    try {
      const department = await DepartmentService.createDepartment(req.body);
      res.status(201).json({
        success: true,
        message: "Department created successfully.",
        data: { department }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateDepartment(req, res, next) {
    try {
      const departmentId = Number(req.params.departmentId);
      const department = await DepartmentService.updateDepartment(departmentId, req.body);
      res.status(200).json({
        success: true,
        message: "Department updated successfully.",
        data: { department }
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteDepartment(req, res, next) {
    try {
      const departmentId = Number(req.params.departmentId);
      await DepartmentService.deleteDepartment(departmentId);
      res.status(200).json({
        success: true,
        message: "Department deleted successfully."
      });
    } catch (err) {
      next(err);
    }
  }
};

