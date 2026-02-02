'use strict';

/**
 * Soft Delete (Paranoid) Utilities
 * 
 * Provides centralized utilities for enforcing soft-delete behavior across the codebase.
 * 
 * INVARIANTS:
 * - Soft-deleted records are treated as non-existent by default
 * - All queries respect paranoid behavior unless explicitly overridden
 * - Joins must not accidentally leak soft-deleted records
 * - Override to include deleted records must be explicit and intentional
 * 
 * USAGE:
 * - Use assertNotDeleted() to validate entities before operations
 * - Use applyParanoidInclude() when building Sequelize includes
 * - Use withDeletedRecords() only for admin audit/recovery paths
 */

const httpError = require('./httpError.js');

/**
 * Assert that an entity has not been soft-deleted
 * 
 * @param {Object} entity - Sequelize model instance
 * @param {string} entityName - Human-readable name for error messages
 * @throws {HttpError} 404 if entity is null/undefined or soft-deleted
 */
function assertNotDeleted(entity, entityName = 'Record') {
  if (!entity) {
    throw httpError(`${entityName} not found.`, 404);
  }

  // Check for soft-delete timestamp (snake_case due to underscored: true)
  if (entity.deleted_at !== null && entity.deleted_at !== undefined) {
    throw httpError(`${entityName} not found.`, 404);
  }

  // Also check camelCase variant for safety
  if (entity.deletedAt !== null && entity.deletedAt !== undefined) {
    throw httpError(`${entityName} not found.`, 404);
  }
}

/**
 * Check if an entity is soft-deleted
 * 
 * @param {Object} entity - Sequelize model instance
 * @returns {boolean} True if entity is soft-deleted
 */
function isDeleted(entity) {
  if (!entity) return true;
  
  // Check both snake_case and camelCase
  return (entity.deleted_at !== null && entity.deleted_at !== undefined) ||
         (entity.deletedAt !== null && entity.deletedAt !== undefined);
}

/**
 * Check if an entity is active (not soft-deleted)
 * 
 * @param {Object} entity - Sequelize model instance
 * @returns {boolean} True if entity exists and is not soft-deleted
 */
function isActive(entity) {
  return entity && !isDeleted(entity);
}

/**
 * Apply paranoid-safe include options for Sequelize queries
 * Ensures soft-deleted related records are excluded from joins
 * 
 * By default, Sequelize respects paranoid on includes, but this utility
 * makes the intention explicit and prevents accidental paranoid: false
 * 
 * @param {Object} includeOptions - Base Sequelize include options
 * @param {Object} options - Configuration options
 * @param {boolean} options.required - Whether the join is required (INNER vs LEFT)
 * @param {boolean} options.includeDeleted - DANGER: Include soft-deleted records (admin only)
 * @returns {Object} Modified include options with paranoid enforcement
 */
function applyParanoidInclude(includeOptions, options = {}) {
  const { required = false, includeDeleted = false } = options;

  // By default, paranoid models exclude deleted records
  // Only allow includeDeleted in explicit admin contexts
  const result = {
    ...includeOptions,
    required
  };

  // Only set paranoid: false if explicitly requested
  // This is a DANGER path and should only be used for admin audit
  if (includeDeleted === true) {
    result.paranoid = false;
  }

  return result;
}

/**
 * Create query options that include soft-deleted records
 * 
 * DANGER: This bypasses soft-delete protection
 * Use ONLY for:
 * - Admin audit trails
 * - Recovery operations
 * - Diagnostic queries
 * 
 * @param {Object} queryOptions - Base Sequelize query options
 * @returns {Object} Query options with paranoid: false
 */
function withDeletedRecords(queryOptions = {}) {
  return {
    ...queryOptions,
    paranoid: false
  };
}

/**
 * Create query options that explicitly respect soft deletes
 * This is the default behavior but makes intention explicit
 * 
 * @param {Object} queryOptions - Base Sequelize query options
 * @returns {Object} Query options with paranoid: true
 */
function withoutDeletedRecords(queryOptions = {}) {
  return {
    ...queryOptions,
    paranoid: true
  };
}

/**
 * Build a where clause that explicitly excludes soft-deleted records
 * Useful when you need to add explicit deleted_at: null conditions
 * (e.g., in raw queries or complex joins)
 * 
 * @param {Object} whereClause - Existing where clause
 * @returns {Object} Where clause with deleted_at: null
 */
function excludeDeletedWhere(whereClause = {}) {
  return {
    ...whereClause,
    deleted_at: null
  };
}

/**
 * Filter an array of entities to exclude soft-deleted ones
 * Useful for post-processing query results if needed
 * 
 * @param {Array} entities - Array of Sequelize model instances
 * @returns {Array} Filtered array with only active entities
 */
function filterDeleted(entities) {
  if (!Array.isArray(entities)) return entities;
  return entities.filter(isActive);
}

/**
 * Assert that a parent entity and its related child are both active
 * Useful for validating relationships before operations
 * 
 * @param {Object} parent - Parent entity
 * @param {string} parentName - Name for error messages
 * @param {Object} child - Related child entity
 * @param {string} childName - Name for error messages
 * @throws {HttpError} 404 if either is deleted
 */
function assertRelationshipActive(parent, parentName, child, childName) {
  assertNotDeleted(parent, parentName);
  assertNotDeleted(child, childName);
}

/**
 * Validate that an entity can be used for assignment
 * Specifically checks that the entity is not soft-deleted
 * 
 * @param {Object} entity - Entity to validate
 * @param {string} entityName - Name for error messages
 * @returns {boolean} True if entity is valid for assignment
 */
function isValidForAssignment(entity, entityName = 'Entity') {
  if (!entity) {
    return false;
  }
  return isActive(entity);
}

/**
 * Get the soft-delete status message for an entity
 * Useful for building assignment outcome reasons
 * 
 * @param {Object} entity - Entity to check
 * @param {string} entityName - Name for messages
 * @returns {Object} { isDeleted: boolean, reason: string }
 */
function getSoftDeleteStatus(entity, entityName = 'Entity') {
  if (!entity) {
    return {
      isDeleted: true,
      reason: `${entityName} not found`
    };
  }

  if (isDeleted(entity)) {
    return {
      isDeleted: true,
      reason: `${entityName} is inactive (soft-deleted)`
    };
  }

  return {
    isDeleted: false,
    reason: null
  };
}

module.exports = {
  // Assertion functions
  assertNotDeleted,
  assertRelationshipActive,

  // Check functions
  isDeleted,
  isActive,
  isValidForAssignment,
  getSoftDeleteStatus,

  // Query option builders
  applyParanoidInclude,
  withDeletedRecords,
  withoutDeletedRecords,
  excludeDeletedWhere,

  // Array utilities
  filterDeleted
};
