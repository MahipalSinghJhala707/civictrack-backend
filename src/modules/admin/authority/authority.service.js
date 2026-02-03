const { Authority, Department, AuthorityIssue, Issue, sequelize } = require("../../../models");
const httpError = require("../../../shared/utils/httpError.js");
const { validateCityScope, applyCityFilter, buildParanoidOptions } = require("../../../shared/utils/cityScope.js");
const {
  buildQueryOptions,
  buildPaginatedResponse
} = require("../../../shared/utils/pagination.js");
const { assertNotDeleted } = require("../../../shared/utils/softDelete.js");

/**
 * Department include for authority queries
 * 
 * SOFT-DELETE BEHAVIOR:
 * - paranoid: true (default) excludes soft-deleted departments
 * - required: false allows authorities with deleted departments to still appear
 */
const departmentInclude = {
  model: Department,
  as: "department",
  attributes: ["id", "name"],
  required: false // Allow null if department was soft-deleted
  // paranoid: true is default
};

/**
 * Validate that a department exists and is active
 */
const ensureDepartmentExists = async (departmentId) => {
  if (!departmentId) return null;
  const department = await Department.findByPk(departmentId);
  // findByPk with paranoid: true (default) returns null if soft-deleted
  assertNotDeleted(department, 'Department');
  return department;
};

module.exports = {
  /**
   * List authorities with city scoping and mandatory pagination
   * 
   * SOFT-DELETE BEHAVIOR:
   * - By default, excludes soft-deleted authorities (paranoid: true)
   * - If adminContext.includeDeleted is true, includes soft-deleted authorities
   *   (for admin audit/diagnostic purposes only)
   * 
   * @param {Object} adminContext - { adminCityId, includeAllCities, includeDeleted }
   * @param {Object} pagination - { page, limit, offset, sortBy, sortOrder, entityType }
   * @returns {Promise<{data: Array, meta: Object}>}
   */
  async listAuthorities(adminContext = {}, pagination = {}) {
    validateCityScope(adminContext);
    
    const whereClause = applyCityFilter({}, adminContext, 'city_id');
    const paranoidOptions = buildParanoidOptions(adminContext);
    
    // Build pagination options (defaults applied if not provided)
    const paginationOptions = buildQueryOptions({
      ...pagination,
      entityType: 'authorities'
    });

    const { rows, count } = await Authority.findAndCountAll({
      where: whereClause,
      include: [departmentInclude],
      ...paginationOptions,
      ...paranoidOptions, // Apply paranoid options from admin context
      distinct: true
    });

    return buildPaginatedResponse(rows, count, {
      page: pagination.page || 1,
      limit: pagination.limit || 20
    });
  },

  async createAuthority(payload) {
    await ensureDepartmentExists(payload.departmentId);

    const authority = await Authority.create({
      name: payload.name,
      city: payload.city,
      region: payload.region,
      department_id: payload.departmentId || null,
      address: payload.address || null
    });

    return Authority.findByPk(authority.id, {
      include: [departmentInclude]
    });
  },

  async updateAuthority(authorityId, payload) {
    const authority = await Authority.findByPk(authorityId);
    if (!authority) {
      throw httpError("The requested authority was not found.", 404);
    }

    if (payload.departmentId) {
      await ensureDepartmentExists(payload.departmentId);
    }

    await authority.update({
      name: payload.name ?? authority.name,
      city: payload.city ?? authority.city,
      region: payload.region ?? authority.region,
      department_id:
        payload.departmentId !== undefined
          ? payload.departmentId
          : authority.department_id,
      address: payload.address ?? authority.address
    });

    return Authority.findByPk(authority.id, {
      include: [departmentInclude]
    });
  },

  async deleteAuthority(authorityId) {
    const deleted = await Authority.destroy({ where: { id: authorityId } });
    if (!deleted) {
      throw httpError("The requested authority was not found.", 404);
    }
  },

  async getAuthorityIssues(authorityId) {
    const authority = await Authority.findByPk(authorityId);
    if (!authority) {
      throw httpError("The requested authority was not found.", 404);
    }

    // Get all authority-issue mappings for this authority
    const authorityIssues = await AuthorityIssue.findAll({
      where: { authority_id: authorityId }
    });

    if (authorityIssues.length === 0) {
      return [];
    }

    // Extract issue IDs and fetch the issues
    const issueIds = authorityIssues.map(ai => ai.issue_id);
    const issues = await Issue.findAll({
      where: { id: issueIds },
      attributes: ["id", "name", "slug", "description"],
      order: [["name", "ASC"]]
    });

    return issues;
  },

  async updateAuthorityIssues(authorityId, issueIds) {
    const authority = await Authority.findByPk(authorityId);
    if (!authority) {
      throw httpError("Authority not found.", 404);
    }

    // Normalize issueIds - handle undefined, null, or empty array
    const normalizedIssueIds = Array.isArray(issueIds) ? issueIds : [];

    // Validate all issue IDs exist (if any provided)
    if (normalizedIssueIds.length > 0) {
      const issues = await Issue.findAll({
        where: { id: normalizedIssueIds }
      });

      if (issues.length !== normalizedIssueIds.length) {
        const foundIds = issues.map(i => i.id);
        const missingIds = normalizedIssueIds.filter(id => !foundIds.includes(id));
        throw httpError(`One or more issue categories do not exist. Invalid IDs: ${missingIds.join(", ")}`, 404);
      }
    }

    return sequelize.transaction(async (transaction) => {
      // Delete all existing mappings for this authority
      await AuthorityIssue.destroy({
        where: { authority_id: authorityId },
        transaction
      });

      // Create new mappings if issueIds provided
      if (normalizedIssueIds.length > 0) {
        const mappings = normalizedIssueIds.map(issueId => ({
          authority_id: authorityId,
          issue_id: issueId
        }));

        await AuthorityIssue.bulkCreate(mappings, { transaction });
      }

      // Return updated authority with its issues
      const updatedMappings = await AuthorityIssue.findAll({
        where: { authority_id: authorityId },
        transaction
      });

      let issues = [];
      if (updatedMappings.length > 0) {
        const updatedIssueIds = updatedMappings.map(ai => ai.issue_id);
        issues = await Issue.findAll({
          where: { id: updatedIssueIds },
          attributes: ["id", "name", "slug", "description"],
          order: [["name", "ASC"]],
          transaction
        });
      }

      return {
        authority: {
          id: authority.id,
          name: authority.name,
          city: authority.city,
          region: authority.region
        },
        issues
      };
    });
  }
};

