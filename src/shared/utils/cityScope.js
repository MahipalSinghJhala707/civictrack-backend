'use strict';

/**
 * City Scoping Utilities
 * 
 * Provides helper functions for applying city-based filtering
 * to admin queries. All admin list endpoints should be city-scoped
 * by default unless explicitly requesting cross-city data.
 * 
 * Also handles admin override for viewing soft-deleted records
 * (audit/diagnostic purposes only).
 */

const httpError = require('./httpError.js');

/**
 * Extract admin context from request
 * 
 * @param {Object} req - Express request object
 * @returns {Object} Admin context with cityId, includeAllCities, and includeDeleted flags
 */
function extractAdminContext(req) {
  // cityId can come from:
  // 1. Query param: ?cityId=1
  // 2. Request body: { cityId: 1 }
  // 3. User's city (if admin has a home city)
  const cityIdFromQuery = req.query.cityId ? Number(req.query.cityId) : null;
  const cityIdFromBody = req.body?.cityId ? Number(req.body.cityId) : null;
  const cityIdFromUser = req.user?.city_id ? Number(req.user.city_id) : null;

  // Explicit flag to include all cities (cross-city query)
  // Must be explicitly set to 'true' string or boolean true
  const includeAllCities = 
    req.query.includeAllCities === 'true' || 
    req.query.includeAllCities === true ||
    req.body?.includeAllCities === true;

  // Explicit flag to include soft-deleted records (admin audit only)
  // DANGER: This bypasses soft-delete protection
  // Should only be used for audit trails and diagnostic purposes
  const includeDeleted = 
    req.query.includeDeleted === 'true' || 
    req.query.includeDeleted === true ||
    req.body?.includeDeleted === true;

  // Priority: query param > body > user's city
  const adminCityId = cityIdFromQuery || cityIdFromBody || cityIdFromUser;

  return {
    adminCityId,
    includeAllCities,
    includeDeleted
  };
}

/**
 * Validate that city scope is properly defined
 * Throws error if neither cityId nor includeAllCities is provided
 * 
 * @param {Object} context - Admin context object
 * @throws {HttpError} If city scope is ambiguous
 */
function validateCityScope(context) {
  const { adminCityId, includeAllCities } = context;

  if (!includeAllCities && !adminCityId) {
    throw httpError(
      'Please select a city to view data, or enable cross-city access.',
      400
    );
  }
}

/**
 * Build city filter clause for Sequelize where conditions
 * 
 * @param {Object} context - Admin context with cityId and includeAllCities
 * @param {string} fieldName - The field name to filter (default: 'city_id')
 * @returns {Object|null} Where clause object or null if no filtering needed
 */
function buildCityFilter(context, fieldName = 'city_id') {
  const { adminCityId, includeAllCities } = context;

  // If includeAllCities is true, return null (no city filter)
  if (includeAllCities) {
    return null;
  }

  // If we have a cityId, return the filter
  if (adminCityId) {
    return { [fieldName]: adminCityId };
  }

  // This shouldn't happen if validateCityScope was called first
  return null;
}

/**
 * Apply city filter to an existing where clause
 * 
 * @param {Object} whereClause - Existing Sequelize where clause
 * @param {Object} context - Admin context with cityId and includeAllCities
 * @param {string} fieldName - The field name to filter (default: 'city_id')
 * @returns {Object} Modified where clause with city filter applied
 */
function applyCityFilter(whereClause = {}, context, fieldName = 'city_id') {
  const cityFilter = buildCityFilter(context, fieldName);
  
  if (cityFilter) {
    return { ...whereClause, ...cityFilter };
  }
  
  return whereClause;
}

/**
 * Create a city-scoped query options object
 * Combines where clause, includes, and other options
 * 
 * @param {Object} options - Base query options
 * @param {Object} context - Admin context
 * @param {string} fieldName - The field name to filter
 * @returns {Object} Query options with city scope applied
 */
function withCityScope(options = {}, context, fieldName = 'city_id') {
  const where = applyCityFilter(options.where || {}, context, fieldName);
  
  return {
    ...options,
    where
  };
}

/**
 * Build paranoid option based on admin context
 * 
 * IMPORTANT: Only returns { paranoid: false } if includeDeleted is explicitly true
 * This is a DANGEROUS operation and should only be used for admin audit/diagnostic
 * 
 * @param {Object} context - Admin context with includeDeleted flag
 * @returns {Object} Paranoid options { paranoid: true|false }
 */
function buildParanoidOptions(context) {
  // Default is paranoid: true (exclude soft-deleted)
  // Only disable paranoid if explicitly requested
  if (context && context.includeDeleted === true) {
    return { paranoid: false };
  }
  return { paranoid: true };
}

/**
 * Apply paranoid and city scope to query options
 * Convenience function for admin queries that need both
 * 
 * @param {Object} options - Base query options
 * @param {Object} context - Admin context
 * @param {string} fieldName - The field name for city filter
 * @returns {Object} Query options with city scope and paranoid options applied
 */
function withAdminScope(options = {}, context, fieldName = 'city_id') {
  const scopedOptions = withCityScope(options, context, fieldName);
  const paranoidOptions = buildParanoidOptions(context);
  
  return {
    ...scopedOptions,
    ...paranoidOptions
  };
}

module.exports = {
  extractAdminContext,
  validateCityScope,
  buildCityFilter,
  applyCityFilter,
  withCityScope,
  buildParanoidOptions,
  withAdminScope
};
