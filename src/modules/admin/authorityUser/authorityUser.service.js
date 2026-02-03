const {
  AuthorityUser,
  Authority,
  User
} = require("../../../models");
const httpError = require("../../../shared/utils/httpError.js");
const { validateCityScope, buildParanoidOptions } = require("../../../shared/utils/cityScope.js");
const {
  buildQueryOptions,
  buildPaginatedResponse
} = require("../../../shared/utils/pagination.js");
const { assertNotDeleted } = require("../../../shared/utils/softDelete.js");

/**
 * Include definitions for authority-user queries
 * 
 * SOFT-DELETE BEHAVIOR:
 * - paranoid: true (default) ensures soft-deleted authorities/users are excluded from joins
 * - required: false allows AuthorityUser records to be returned even if related entity is deleted
 *   (the related entity will be null in the response)
 */
const authorityUserIncludes = [
  {
    model: Authority,
    as: "authority",
    attributes: ["id", "name", "city", "region"],
    required: false // Allow null if authority was soft-deleted
    // paranoid: true is default - excludes soft-deleted authorities
  },
  {
    model: User,
    as: "user",
    attributes: ["id", "name", "email"],
    required: false // Allow null if user was soft-deleted
    // paranoid: true is default - excludes soft-deleted users
  }
];

/**
 * Validate that an authority exists and is active
 */
const ensureAuthorityExists = async (authorityId) => {
  const authority = await Authority.findByPk(authorityId);
  // findByPk with paranoid: true (default) returns null if soft-deleted
  assertNotDeleted(authority, 'Authority');
  return authority;
};

/**
 * Validate that a user exists and is active
 */
const ensureUserExists = async (userId) => {
  const user = await User.findByPk(userId);
  // findByPk with paranoid: true (default) returns null if soft-deleted
  assertNotDeleted(user, 'User');
  return user;
};

module.exports = {
  /**
   * List authority-user mappings with city scoping and mandatory pagination
   * Filter based on the authority's city_id
   * 
   * SOFT-DELETE BEHAVIOR:
   * - By default, excludes soft-deleted authority-user mappings (paranoid: true)
   * - If adminContext.includeDeleted is true, includes soft-deleted mappings
   *   (for admin audit/diagnostic purposes only)
   * 
   * @param {Object} adminContext - { adminCityId, includeAllCities, includeDeleted }
   * @param {Object} pagination - { page, limit, offset, sortBy, sortOrder, entityType }
   * @returns {Promise<{data: Array, meta: Object}>}
   */
  async listAuthorityUsers(adminContext = {}, pagination = {}) {
    validateCityScope(adminContext);
    
    const { adminCityId, includeAllCities } = adminContext;
    const paranoidOptions = buildParanoidOptions(adminContext);
    
    // Build authority include with optional city filter
    const authorityIncludeWithFilter = {
      model: Authority,
      as: "authority",
      attributes: ["id", "name", "city", "region", "city_id"],
      ...(includeAllCities ? {} : { where: { city_id: adminCityId } })
    };
    
    // Build pagination options (defaults applied if not provided)
    const paginationOptions = buildQueryOptions({
      ...pagination,
      entityType: 'authorityUsers'
    });

    const { rows, count } = await AuthorityUser.findAndCountAll({
      include: [
        authorityIncludeWithFilter,
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"]
        }
      ],
      ...paginationOptions,
      ...paranoidOptions, // Apply paranoid options from admin context
      distinct: true
    });

    return buildPaginatedResponse(rows, count, {
      page: pagination.page || 1,
      limit: pagination.limit || 20
    });
  },

  async createAuthorityUser({ authorityId, userId }) {
    await ensureAuthorityExists(authorityId);
    await ensureUserExists(userId);

    const existing = await AuthorityUser.findOne({ where: { user_id: userId } });
    if (existing) {
      throw httpError("This user is already assigned to an authority.", 409);
    }

    const authorityUser = await AuthorityUser.create({
      authority_id: authorityId,
      user_id: userId
    });

    return AuthorityUser.findByPk(authorityUser.id, {
      include: authorityUserIncludes
    });
  },

  async updateAuthorityUser(authorityUserId, { authorityId }) {
    const authorityUser = await AuthorityUser.findByPk(authorityUserId);
    if (!authorityUser) {
      throw httpError("Authority user mapping not found.", 404);
    }

    await ensureAuthorityExists(authorityId);

    await authorityUser.update({
      authority_id: authorityId
    });

    return AuthorityUser.findByPk(authorityUser.id, {
      include: authorityUserIncludes
    });
  },

  async deleteAuthorityUser(authorityUserId) {
    const deleted = await AuthorityUser.destroy({ where: { id: authorityUserId } });
    if (!deleted) {
      throw httpError("Authority user mapping not found.", 404);
    }
  }
};

