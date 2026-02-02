'use strict';

/**
 * Pagination & Ordering Utility
 * 
 * Provides mandatory pagination and explicit ordering for all list endpoints.
 * Every list query MUST use this utility - no unbounded result sets allowed.
 * 
 * INVARIANTS (enforced at runtime):
 * - Every entityType MUST have a DEFAULT_ORDER defined
 * - Every entityType MUST have ALLOWED_SORT_FIELDS defined
 * - No query can execute without an ORDER BY clause
 * - Unknown entity types cause immediate failure (no silent fallbacks)
 * 
 * Domain Rules:
 * - Pagination is mandatory with defaults
 * - Every query has explicit ORDER BY
 * - Pagination/ordering happens at DATABASE level
 * - Unknown sortBy fields are rejected
 */

const httpError = require('./httpError.js');

/**
 * Pagination defaults and limits
 */
const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100
};

/**
 * Supported entity types
 * Add new entity types here FIRST, then define their sort fields and default order
 */
const SUPPORTED_ENTITY_TYPES = [
  'issues',
  'flaggedReports',
  'users',
  'authorities',
  'authorityUsers'
];

/**
 * Allowed sort fields per entity type
 * Only these fields can be used for sorting - prevents SQL injection
 * 
 * INVARIANT: Every entity in SUPPORTED_ENTITY_TYPES MUST have an entry here
 */
const ALLOWED_SORT_FIELDS = {
  issues: ['createdAt', 'updatedAt', 'status', 'title'],
  flaggedReports: ['createdAt', 'updatedAt', 'flagCount'],
  users: ['createdAt', 'updatedAt', 'name', 'email'],
  authorities: ['createdAt', 'updatedAt', 'name', 'city', 'region'],
  authorityUsers: ['createdAt', 'updatedAt']
};

/**
 * Default ordering per entity type
 * 
 * INVARIANT: Every entity in SUPPORTED_ENTITY_TYPES MUST have an entry here
 * INVARIANT: Default order MUST be a non-empty array
 */
const DEFAULT_ORDER = {
  issues: [['createdAt', 'DESC']],
  flaggedReports: [['updatedAt', 'DESC']],
  users: [['createdAt', 'DESC']],
  authorities: [['createdAt', 'DESC']],
  authorityUsers: [['createdAt', 'DESC']]
};

/**
 * Allowed sort order values
 */
const ALLOWED_SORT_ORDERS = ['ASC', 'DESC'];

/**
 * Validate that all invariants are satisfied at module load time
 * This catches configuration errors during development, not at runtime
 */
function validateConfigurationInvariants() {
  const errors = [];

  for (const entityType of SUPPORTED_ENTITY_TYPES) {
    // Check ALLOWED_SORT_FIELDS
    if (!ALLOWED_SORT_FIELDS[entityType]) {
      errors.push(`ALLOWED_SORT_FIELDS missing for entity type: ${entityType}`);
    } else if (!Array.isArray(ALLOWED_SORT_FIELDS[entityType]) || ALLOWED_SORT_FIELDS[entityType].length === 0) {
      errors.push(`ALLOWED_SORT_FIELDS for ${entityType} must be a non-empty array`);
    }

    // Check DEFAULT_ORDER
    if (!DEFAULT_ORDER[entityType]) {
      errors.push(`DEFAULT_ORDER missing for entity type: ${entityType}`);
    } else if (!Array.isArray(DEFAULT_ORDER[entityType]) || DEFAULT_ORDER[entityType].length === 0) {
      errors.push(`DEFAULT_ORDER for ${entityType} must be a non-empty array`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Pagination configuration invariants violated:\n  - ${errors.join('\n  - ')}\n` +
      `Fix these errors before the application can start.`
    );
  }
}

// Run validation at module load time
validateConfigurationInvariants();

/**
 * Validate that an entity type is supported
 * 
 * @param {string} entityType - Entity type to validate
 * @throws {Error} If entity type is not supported (programmer error, 500)
 */
function assertValidEntityType(entityType) {
  if (!entityType) {
    throw new Error(
      'Pagination: entityType is required but was not provided. ' +
      'This is a programmer error - ensure extractPaginationContext receives an entityType.'
    );
  }

  if (!SUPPORTED_ENTITY_TYPES.includes(entityType)) {
    throw new Error(
      `Pagination: Unknown entity type "${entityType}". ` +
      `Supported types: ${SUPPORTED_ENTITY_TYPES.join(', ')}. ` +
      'To add a new entity type, update SUPPORTED_ENTITY_TYPES, ALLOWED_SORT_FIELDS, and DEFAULT_ORDER.'
    );
  }
}

/**
 * Get the default order for an entity type
 * 
 * @param {string} entityType - Entity type
 * @returns {Array} Default order clause (guaranteed non-empty)
 * @throws {Error} If entity type has no default order (should never happen after validation)
 */
function getDefaultOrder(entityType) {
  assertValidEntityType(entityType);

  const defaultOrder = DEFAULT_ORDER[entityType];

  // This should never happen if validateConfigurationInvariants passed
  // but we check anyway for defense in depth
  if (!defaultOrder || !Array.isArray(defaultOrder) || defaultOrder.length === 0) {
    throw new Error(
      `Pagination: DEFAULT_ORDER for "${entityType}" is missing or empty. ` +
      'This indicates a configuration error that should have been caught at startup.'
    );
  }

  return defaultOrder;
}

/**
 * Get allowed sort fields for an entity type
 * 
 * @param {string} entityType - Entity type
 * @returns {Array} Allowed sort fields
 * @throws {Error} If entity type has no allowed fields
 */
function getAllowedSortFields(entityType) {
  assertValidEntityType(entityType);

  const allowedFields = ALLOWED_SORT_FIELDS[entityType];

  // This should never happen if validateConfigurationInvariants passed
  if (!allowedFields || !Array.isArray(allowedFields) || allowedFields.length === 0) {
    throw new Error(
      `Pagination: ALLOWED_SORT_FIELDS for "${entityType}" is missing or empty. ` +
      'This indicates a configuration error that should have been caught at startup.'
    );
  }

  return allowedFields;
}

/**
 * Parse and validate pagination parameters from request query
 * 
 * @param {Object} query - Request query object
 * @returns {Object} Validated pagination params { page, limit, offset }
 * @throws {HttpError} If pagination params are invalid
 */
function parsePaginationParams(query = {}) {
  const { page: pageStr, limit: limitStr } = query;

  // Parse page (1-based)
  let page = PAGINATION_DEFAULTS.page;
  if (pageStr !== undefined && pageStr !== '') {
    page = parseInt(pageStr, 10);
    if (isNaN(page) || page < 1) {
      throw httpError('page must be a positive integer (1 or greater)', 400);
    }
  }

  // Parse limit
  let limit = PAGINATION_DEFAULTS.limit;
  if (limitStr !== undefined && limitStr !== '') {
    limit = parseInt(limitStr, 10);
    if (isNaN(limit) || limit <= 0) {
      throw httpError('limit must be a positive integer', 400);
    }
    if (limit > PAGINATION_DEFAULTS.maxLimit) {
      throw httpError(`limit cannot exceed ${PAGINATION_DEFAULTS.maxLimit}`, 400);
    }
  }

  // Calculate offset (0-based for database)
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Parse and validate sorting parameters from request query
 * 
 * @param {Object} query - Request query object
 * @param {string} entityType - Entity type for field allowlist
 * @returns {Object} Validated sort params { sortBy, sortOrder }
 * @throws {HttpError} If sort params are invalid
 */
function parseSortParams(query = {}, entityType) {
  // Validate entity type first (throws programmer error if invalid)
  assertValidEntityType(entityType);

  const { sortBy, sortOrder } = query;
  const allowedFields = getAllowedSortFields(entityType);

  let validatedSortBy = null;
  let validatedSortOrder = 'DESC';

  // Validate sortBy if provided
  if (sortBy !== undefined && sortBy !== '') {
    if (!allowedFields.includes(sortBy)) {
      throw httpError(
        `Invalid sortBy field "${sortBy}". Allowed values: ${allowedFields.join(', ')}`,
        400
      );
    }
    validatedSortBy = sortBy;
  }

  // Validate sortOrder if provided
  if (sortOrder !== undefined && sortOrder !== '') {
    const upperOrder = sortOrder.toUpperCase();
    if (!ALLOWED_SORT_ORDERS.includes(upperOrder)) {
      throw httpError(
        `Invalid sortOrder "${sortOrder}". Allowed values: ${ALLOWED_SORT_ORDERS.join(', ')}`,
        400
      );
    }
    validatedSortOrder = upperOrder;
  }

  return { sortBy: validatedSortBy, sortOrder: validatedSortOrder };
}

/**
 * Build Sequelize order clause from sort params
 * 
 * INVARIANT: This function ALWAYS returns a non-empty order array
 * 
 * @param {Object} sortParams - { sortBy, sortOrder }
 * @param {string} entityType - Entity type for default ordering
 * @returns {Array} Sequelize order array (guaranteed non-empty)
 * @throws {Error} If no order can be determined (should never happen)
 */
function buildOrderClause(sortParams, entityType) {
  // Validate entity type (throws programmer error if invalid)
  assertValidEntityType(entityType);

  const { sortBy, sortOrder } = sortParams;

  let order;

  if (sortBy) {
    // Client-specified sorting
    order = [[sortBy, sortOrder || 'DESC']];
  } else {
    // Use mandatory default order
    order = getDefaultOrder(entityType);
  }

  // Final safety check: order must NEVER be empty or undefined
  if (!order || !Array.isArray(order) || order.length === 0) {
    throw new Error(
      `Pagination: Failed to build order clause for "${entityType}". ` +
      'This is a critical invariant violation - no query should execute without ORDER BY.'
    );
  }

  return order;
}

/**
 * Extract pagination context from request
 * Use this in controllers to extract and pass pagination to services
 * 
 * @param {Object} req - Express request object
 * @param {string} entityType - Entity type for sorting allowlist (REQUIRED)
 * @returns {Object} Pagination context for service
 * @throws {Error} If entityType is missing or invalid
 */
function extractPaginationContext(req, entityType) {
  // Validate entity type FIRST - fail fast on programmer errors
  assertValidEntityType(entityType);

  const paginationParams = parsePaginationParams(req.query);
  const sortParams = parseSortParams(req.query, entityType);

  return {
    ...paginationParams,
    ...sortParams,
    entityType
  };
}

/**
 * Build Sequelize query options for pagination and ordering
 * Use this in services to apply pagination to queries
 * 
 * INVARIANT: The returned object ALWAYS contains a non-empty order array
 * 
 * @param {Object} paginationContext - From extractPaginationContext
 * @returns {Object} Sequelize query options { limit, offset, order }
 * @throws {Error} If order cannot be determined
 */
function buildQueryOptions(paginationContext) {
  const { limit, offset, entityType, sortBy, sortOrder } = paginationContext;

  // Validate entity type (throws programmer error if invalid)
  assertValidEntityType(entityType);

  const order = buildOrderClause({ sortBy, sortOrder }, entityType);

  // Final assertion: order must be valid
  if (!order || order.length === 0) {
    throw new Error(
      `Pagination: buildQueryOptions failed to produce a valid order for "${entityType}". ` +
      'This should never happen and indicates a bug in the pagination utility.'
    );
  }

  return {
    limit,
    offset,
    order
  };
}

/**
 * Build paginated response with meta information
 * 
 * @param {Array} data - Query results
 * @param {number} total - Total count (before pagination)
 * @param {Object} paginationContext - Pagination params
 * @returns {Object} { data, meta }
 */
function buildPaginatedResponse(data, total, paginationContext) {
  const { page, limit } = paginationContext;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}

/**
 * Execute a paginated query with count
 * Convenience function that runs findAndCountAll with pagination
 * 
 * @param {Model} model - Sequelize model
 * @param {Object} queryOptions - Base query options (where, include, etc.)
 * @param {Object} paginationContext - From extractPaginationContext
 * @returns {Promise<Object>} { data, meta }
 */
async function executePaginatedQuery(model, queryOptions, paginationContext) {
  const paginationOptions = buildQueryOptions(paginationContext);

  const { rows, count } = await model.findAndCountAll({
    ...queryOptions,
    ...paginationOptions,
    distinct: true // Important for accurate count with includes
  });

  return buildPaginatedResponse(rows, count, paginationContext);
}

module.exports = {
  // Constants
  PAGINATION_DEFAULTS,
  SUPPORTED_ENTITY_TYPES,
  ALLOWED_SORT_FIELDS,
  DEFAULT_ORDER,
  ALLOWED_SORT_ORDERS,

  // Validation functions
  assertValidEntityType,
  getDefaultOrder,
  getAllowedSortFields,

  // Parsing functions
  parsePaginationParams,
  parseSortParams,

  // Building functions
  buildOrderClause,
  buildQueryOptions,
  buildPaginatedResponse,

  // Controller helper
  extractPaginationContext,

  // Service helper
  executePaginatedQuery
};
