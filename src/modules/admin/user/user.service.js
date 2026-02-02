const bcrypt = require("bcrypt");
const {
  User,
  Role,
  UserRole,
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
      include: [roleInclude],
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
          throw httpError("One or more roles do not exist.", 404);
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

  async updateUserRoles(userId, roleIds = []) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw httpError("User not found.", 404);
    }

    const rolesToAssign = sanitizeRoleIds(roleIds);

    if (!rolesToAssign.length) {
      throw httpError("roleIds must contain at least one value.", 422);
    }

    const foundRoles = await Role.findAll({
      where: { id: rolesToAssign }
    });

    if (foundRoles.length !== rolesToAssign.length) {
      throw httpError("One or more roles do not exist.", 404);
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

