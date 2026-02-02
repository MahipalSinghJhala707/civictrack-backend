const AuthorityUserService = require("./authorityUser.service.js");
const { extractAdminContext } = require("../../../shared/utils/cityScope.js");
const { extractPaginationContext } = require("../../../shared/utils/pagination.js");

module.exports = {
  async listAuthorityUsers(req, res, next) {
    try {
      const adminContext = extractAdminContext(req);
      const pagination = extractPaginationContext(req, 'authorityUsers');
      const result = await AuthorityUserService.listAuthorityUsers(adminContext, pagination);
      res.status(200).json({
        success: true,
        data: { authorityUsers: result.data },
        meta: result.meta
      });
    } catch (err) {
      next(err);
    }
  },

  async createAuthorityUser(req, res, next) {
    try {
      const authorityUser = await AuthorityUserService.createAuthorityUser(req.body);
      res.status(201).json({
        success: true,
        message: "Authority user created successfully.",
        data: { authorityUser }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateAuthorityUser(req, res, next) {
    try {
      const authorityUserId = Number(req.params.authorityUserId);
      const authorityUser = await AuthorityUserService.updateAuthorityUser(
        authorityUserId,
        req.body
      );
      res.status(200).json({
        success: true,
        message: "Authority user updated successfully.",
        data: { authorityUser }
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteAuthorityUser(req, res, next) {
    try {
      const authorityUserId = Number(req.params.authorityUserId);
      await AuthorityUserService.deleteAuthorityUser(authorityUserId);
      res.status(200).json({
        success: true,
        message: "Authority user deleted successfully."
      });
    } catch (err) {
      next(err);
    }
  }
};

