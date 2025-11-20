const { Issue } = require("../../../models");
const httpError = require("../../../shared/utils/httpError.js");

module.exports = {
  async listIssueCategories() {
    return Issue.findAll({
      order: [["name", "ASC"]]
    });
  },

  async createIssueCategory({ name, slug, description }) {
    // Check if category with same name already exists
    const existing = await Issue.findOne({ where: { name } });
    if (existing) {
      throw httpError("Issue category with this name already exists.", 409);
    }

    // Generate slug from name if not provided
    const categorySlug = slug || name.toLowerCase().replace(/\s+/g, "-");

    return Issue.create({ name, slug: categorySlug, description });
  },

  async updateIssueCategory(categoryId, payload) {
    const category = await Issue.findByPk(categoryId);
    if (!category) {
      throw httpError("Issue category not found.", 404);
    }

    // Check if new name conflicts with existing category
    if (payload.name && payload.name !== category.name) {
      const existing = await Issue.findOne({ where: { name: payload.name } });
      if (existing) {
        throw httpError("Issue category with this name already exists.", 409);
      }
    }

    await category.update({
      name: payload.name ?? category.name,
      slug: payload.slug ?? category.slug,
      description: payload.description ?? category.description
    });

    return category;
  },

  async deleteIssueCategory(categoryId) {
    const deleted = await Issue.destroy({ where: { id: categoryId } });
    if (!deleted) {
      throw httpError("Issue category not found.", 404);
    }
  }
};

