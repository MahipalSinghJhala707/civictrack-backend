const UserService = require("./user.service.js");
const { extractAdminContext } = require("../../../shared/utils/cityScope.js");
const { extractPaginationContext } = require("../../../shared/utils/pagination.js");

module.exports = {
  async listUsers(req, res, next) {
    try {
      const adminContext = extractAdminContext(req);
      const pagination = extractPaginationContext(req, 'users');
      const result = await UserService.listUsers(adminContext, pagination);
      res.status(200).json({
        success: true,
        data: { users: result.data },
        meta: result.meta
      });
    } catch (err) {
      next(err);
    }
  },

  async createUser(req, res, next) {
    try {
      const user = await UserService.createUser(req.body);
      res.status(201).json({
        success: true,
        message: "User created successfully.",
        data: { user }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateUser(req, res, next) {
    try {
      const userId = Number(req.params.userId);
      const user = await UserService.updateUser(userId, req.body);
      res.status(200).json({
        success: true,
        message: "User updated successfully.",
        data: { user }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateUserRoles(req, res, next) {
    try {
      const userId = Number(req.params.userId);
      const user = await UserService.updateUserRoles(userId, req.body.roleIds);
      res.status(200).json({
        success: true,
        message: "User roles updated successfully.",
        data: { user }
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteUser(req, res, next) {
    try {
      const userId = Number(req.params.userId);
      await UserService.deleteUser(userId);
      res.status(200).json({
        success: true,
        message: "User deleted successfully."
      });
    } catch (err) {
      next(err);
    }
  },

  async changeUserPassword(req, res, next) {
    try {
      const userId = Number(req.params.userId);
      const user = await UserService.changeUserPassword(userId, req.body);
      res.status(200).json({
        success: true,
        message: "User password changed successfully.",
        data: { user }
      });
    } catch (err) {
      next(err);
    }
  }
};

