const AuthorityService = require("./authority.service.js");

module.exports = {
  async listAuthorities(req, res, next) {
    try {
      const authorities = await AuthorityService.listAuthorities();
      res.status(200).json({
        success: true,
        data: { authorities }
      });
    } catch (err) {
      next(err);
    }
  },

  async createAuthority(req, res, next) {
    try {
      const authority = await AuthorityService.createAuthority(req.body);
      res.status(201).json({
        success: true,
        message: "Authority created successfully.",
        data: { authority }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateAuthority(req, res, next) {
    try {
      const authorityId = Number(req.params.authorityId);
      const authority = await AuthorityService.updateAuthority(authorityId, req.body);
      res.status(200).json({
        success: true,
        message: "Authority updated successfully.",
        data: { authority }
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteAuthority(req, res, next) {
    try {
      const authorityId = Number(req.params.authorityId);
      await AuthorityService.deleteAuthority(authorityId);
      res.status(200).json({
        success: true,
        message: "Authority deleted successfully."
      });
    } catch (err) {
      next(err);
    }
  },

  async getAuthorityIssues(req, res, next) {
    try {
      const authorityId = Number(req.params.authorityId);
      const issues = await AuthorityService.getAuthorityIssues(authorityId);
      res.status(200).json({
        success: true,
        data: { issues }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateAuthorityIssues(req, res, next) {
    try {
      const authorityId = Number(req.params.authorityId);
      const { issueIds } = req.body;
      const result = await AuthorityService.updateAuthorityIssues(authorityId, issueIds);
      res.status(200).json({
        success: true,
        message: "Authority issue categories updated successfully.",
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};

