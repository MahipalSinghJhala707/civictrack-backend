const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const {
  User,
  Role,
  UserRole,
  Authority,
  AuthorityUser,
  City,
  sequelize
} = require("../../../models");

const httpError = require("../../../shared/utils/httpError.js");
const { validateCityScope, applyCityFilter, buildParanoidOptions } = require("../../../shared/utils/cityScope.js");
const {
  buildQueryOptions,
  buildPaginatedResponse
} = require("../../../shared/utils/pagination.js");

/**
 * Role include for user queries
 * 
 * SOFT-DELETE BEHAVIOR:
 * - paranoid: true (default) excludes soft-deleted roles from the join
 * - Users with deleted role assignments will have those roles excluded from response
 */
const roleInclude = {
  model: Role,
  as: "roles",
  attributes: ["id", "name", "description"],
  through: { attributes: [] }
  // paranoid: true is default - soft-deleted roles excluded
};

/**
 * City include for user queries
 */
const cityInclude = {
  model: City,
  as: "city",
  attributes: ["id", "name"]
};

const sanitizeRoleIds = (roleIds = []) => {
  if (!roleIds) return [];
  if (Array.isArray(roleIds)) return roleIds.map(Number).filter(Boolean);
  return [Number(roleIds)].filter(Boolean);
};

module.exports = {
  /**
   * List users with city scoping and mandatory pagination
   * 
   * SOFT-DELETE BEHAVIOR:
   * - By default, excludes soft-deleted users (paranoid: true)
   * - If adminContext.includeDeleted is true, includes soft-deleted users
   *   (for admin audit/diagnostic purposes only)
   * 
   * @param {Object} adminContext - { adminCityId, includeAllCities, includeDeleted }
   * @param {Object} pagination - { page, limit, offset, sortBy, sortOrder, entityType }
   * @returns {Promise<{data: Array, meta: Object}>}
   */
  async listUsers(adminContext = {}, pagination = {}) {
    validateCityScope(adminContext);
    
    const whereClause = applyCityFilter({}, adminContext, 'city_id');
    const paranoidOptions = buildParanoidOptions(adminContext);
    
    // Build pagination options (defaults applied if not provided)
    const paginationOptions = buildQueryOptions({
      ...pagination,
      entityType: 'users'
    });

    const { rows, count } = await User.findAndCountAll({
      where: whereClause,
      include: [roleInclude, cityInclude],
      ...paginationOptions,
      ...paranoidOptions, // Apply paranoid options from admin context
      distinct: true
    });

    return buildPaginatedResponse(rows, count, {
      page: pagination.page || 1,
      limit: pagination.limit || 20
    });
  },

  async createUser({ name, email, password, roleIds }) {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw httpError("Email is already registered.", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const rolesToAssign = sanitizeRoleIds(roleIds);

    return sequelize.transaction(async (transaction) => {
      const user = await User.create(
        { name, email, password_hash: hashedPassword },
        { transaction }
      );

      if (rolesToAssign.length) {
        const foundRoles = await Role.findAll({
          where: { id: rolesToAssign }
        });

        if (foundRoles.length !== rolesToAssign.length) {
          throw httpError("One or more selected roles do not exist.", 404);
        }

        const userRoles = rolesToAssign.map((roleId) => ({
          user_id: user.id,
          role_id: roleId
        }));

        await UserRole.bulkCreate(userRoles, { transaction });
      }

      return User.findByPk(user.id, {
        include: [roleInclude],
        transaction
      });
    });
  },

  async updateUser(userId, payload) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw httpError("User not found.", 404);
    }

    if (payload.email && payload.email !== user.email) {
      const duplicate = await User.findOne({ where: { email: payload.email } });
      if (duplicate) {
        throw httpError("Email is already registered.", 409);
      }
    }

    await user.update(
      {
        name: payload.name ?? user.name,
        email: payload.email ?? user.email
      }
    );

    return User.findByPk(user.id, {
      include: [roleInclude]
    });
  },

  async updateUserRoles(userId, roleIds = [], authorityId = null) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw httpError("User not found.", 404);
    }

    // Validate roleIds is an array
    if (!Array.isArray(roleIds)) {
      throw httpError("roleIds must be an array.", 422);
    }

    // Sanitize, convert to numbers, and deduplicate
    const sanitizedRoleIds = [...new Set(
      roleIds
        .map(id => parseInt(id, 10))
        .filter(id => !isNaN(id) && id > 0)
    )];

    if (!sanitizedRoleIds.length) {
      throw httpError("roleIds must contain at least one valid role ID.", 422);
    }

    // Find all requested roles using explicit Op.in
    const foundRoles = await Role.findAll({
      where: { id: { [Op.in]: sanitizedRoleIds } }
    });

    if (foundRoles.length !== sanitizedRoleIds.length) {
      throw httpError("One or more selected roles do not exist.", 404);
    }

    // Filter out admin role - admin role cannot be assigned via this API
    const adminRole = foundRoles.find(r => r.name === "admin");
    if (adminRole) {
      throw httpError("Admin role cannot be assigned from this interface.", 403);
    }

    // Final roles to assign (after filtering)
    const rolesToAssign = sanitizedRoleIds;

    // Check if authority role is being assigned
    const authorityRole = foundRoles.find(r => r.name === "authority");
    const hasAuthorityRole = !!authorityRole;

    // Normalize authorityId (support both authorityId and authority field names)
    const normalizedAuthorityId = authorityId || null;

    // Validate authority requirement ONLY if authority role is being assigned
    if (hasAuthorityRole) {
      if (!normalizedAuthorityId) {
        throw httpError("Authority role requires selecting an authority.", 422);
      }
      // Validate authority exists and is not soft-deleted
      const authority = await Authority.findByPk(normalizedAuthorityId);
      if (!authority) {
        throw httpError("Selected authority does not exist.", 404);
      }
      // Validate user's city matches authority's city (if both have city assigned)
      // If user has no city, allow assignment but the user should be assigned to a city
      // Convert to numbers for consistent comparison (handles string vs number type mismatch)
      const userCityIdNum = user.city_id ? parseInt(user.city_id, 10) : null;
      const authCityIdNum = authority.city_id ? parseInt(authority.city_id, 10) : null;
      if (userCityIdNum && authCityIdNum && userCityIdNum !== authCityIdNum) {
        throw httpError("User's city must match the authority's city. Please select an authority from the same city as the user.", 422);
      }
      // If user has no city but authority does, auto-assign user's city from authority
      if (!user.city_id && authority.city_id) {
        await user.update({ city_id: authority.city_id });
      }
    }

    return sequelize.transaction(async (transaction) => {
      // Force delete (hard delete) to ensure records are actually removed
      // This is necessary because UserRole uses paranoid (soft deletes)
      await UserRole.destroy({
        where: { user_id: userId },
        force: true, // Hard delete to bypass soft delete
        transaction
      });

      const userRoles = rolesToAssign.map((roleId) => ({
        user_id: userId,
        role_id: roleId
      }));

      await UserRole.bulkCreate(userRoles, { transaction });

      // Handle authority_user mapping
      // Always remove existing mapping first (including soft-deleted records)
      await AuthorityUser.destroy({
        where: { user_id: userId },
        force: true,
        transaction
      });

      // If user has authority role, create new mapping
      if (hasAuthorityRole && normalizedAuthorityId) {
        // Parse authorityId to ensure it's a number
        const authorityIdNum = parseInt(normalizedAuthorityId, 10);
        console.log(`Creating authority_user link: user_id=${userId}, authority_id=${authorityIdNum}`);
        
        try {
          await AuthorityUser.create({
            user_id: userId,
            authority_id: authorityIdNum
          }, { transaction });
          console.log(`Successfully created authority_user link for user ${userId}`);
        } catch (createErr) {
          console.error(`Failed to create authority_user link:`, createErr.message);
          throw createErr;
        }
      }

      return User.findByPk(userId, {
        include: [roleInclude],
        transaction
      });
    });
  },

  async deleteUser(userId) {
    const deleted = await User.destroy({ where: { id: userId } });
    if (!deleted) {
      throw httpError("User not found.", 404);
    }
  },

  async changeUserPassword(userId, { newPassword }) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw httpError("User not found.", 404);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password_hash: hashedPassword });

    return User.findByPk(user.id, {
      include: [roleInclude]
    });
  }
};

