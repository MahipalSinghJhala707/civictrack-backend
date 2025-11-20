const { Department } = require("../../../models");
const httpError = require("../../../shared/utils/httpError.js");

module.exports = {
  async listDepartments() {
    return Department.findAll({
      order: [["name", "ASC"]]
    });
  },

  async createDepartment({ name, description }) {
    return Department.create({ name, description });
  },

  async updateDepartment(departmentId, payload) {
    const department = await Department.findByPk(departmentId);
    if (!department) {
      throw httpError("Department not found.", 404);
    }

    await department.update({
      name: payload.name ?? department.name,
      description: payload.description ?? department.description
    });

    return department;
  },

  async deleteDepartment(departmentId) {
    const deleted = await Department.destroy({ where: { id: departmentId } });
    if (!deleted) {
      throw httpError("Department not found.", 404);
    }
  }
};

