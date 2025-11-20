const IssueCategoryService = require("./issueCategory.service.js");

module.exports = {
  async listIssueCategories(req, res, next) {
    try {
      const categories = await IssueCategoryService.listIssueCategories();

      return res.status(200).json({
        success: true,
        data: { categories }
      });
    } catch (err) {
      next(err);
    }
  },

  async createIssueCategory(req, res, next) {
    try {
      const category = await IssueCategoryService.createIssueCategory(req.body);

      return res.status(201).json({
        success: true,
        message: "Issue category created successfully.",
        data: { category }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateIssueCategory(req, res, next) {
    try {
      const categoryId = Number(req.params.categoryId);
      const category = await IssueCategoryService.updateIssueCategory(categoryId, req.body);

      return res.status(200).json({
        success: true,
        message: "Issue category updated successfully.",
        data: { category }
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteIssueCategory(req, res, next) {
    try {
      const categoryId = Number(req.params.categoryId);
      await IssueCategoryService.deleteIssueCategory(categoryId);

      return res.status(200).json({
        success: true,
        message: "Issue category deleted successfully."
      });
    } catch (err) {
      next(err);
    }
  }
};

