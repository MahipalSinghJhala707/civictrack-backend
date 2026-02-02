'use strict';

/**
 * Authority Assignment Service
 * 
 * Dedicated service for deterministic authority assignment with explicit outcomes.
 * All assignment logic is centralized here - controllers must NOT contain assignment logic.
 * 
 * SOFT-DELETE INVARIANTS:
 * - Soft-deleted authorities MUST NOT be considered for assignment
 * - Assignment queries use paranoid: true (default) to exclude deleted records
 * - UNASSIGNED_AUTHORITY_INACTIVE is returned when ALL matching authorities are inactive
 * - Admin reassignment explicitly validates target authority is active
 * 
 * Every assignment attempt results in ONE explicit outcome:
 * - ASSIGNED
 * - UNASSIGNED_NO_MATCHING_AUTHORITY
 * - UNASSIGNED_AUTHORITY_INACTIVE
 * - UNASSIGNED_CONFIGURATION_ERROR
 * - REASSIGNED_BY_ADMIN
 */

const { Op } = require('sequelize');
const {
  Authority,
  AuthorityIssue,
  UserIssue,
  Log,
  City,
  sequelize
} = require('../../models');
const httpError = require('../../shared/utils/httpError.js');
const {
  assertNotDeleted,
  isActive,
  withDeletedRecords
} = require('../../shared/utils/softDelete.js');

/**
 * Assignment outcome constants
 * Every assignment attempt MUST result in one of these outcomes
 */
const ASSIGNMENT_OUTCOMES = {
  ASSIGNED: 'ASSIGNED',
  UNASSIGNED_NO_MATCHING_AUTHORITY: 'UNASSIGNED_NO_MATCHING_AUTHORITY',
  UNASSIGNED_AUTHORITY_INACTIVE: 'UNASSIGNED_AUTHORITY_INACTIVE',
  UNASSIGNED_CONFIGURATION_ERROR: 'UNASSIGNED_CONFIGURATION_ERROR',
  REASSIGNED_BY_ADMIN: 'REASSIGNED_BY_ADMIN'
};

/**
 * Trigger types for assignment
 */
const TRIGGER_TYPES = {
  SYSTEM: 'system',      // Auto-assignment on report creation
  ADMIN: 'admin',        // Manual reassignment by admin
  RETRY: 'retry'         // Retry assignment for unassigned reports
};

/**
 * Log type for assignment operations
 * We use the 'comment' field to store structured JSON data
 */
const LOG_TYPE_ASSIGNMENT = 'assignment';

/**
 * Create an assignment log entry
 * 
 * @param {Object} params - Log parameters
 * @param {number} params.reportId - The report ID
 * @param {number} params.userId - The user who triggered the assignment
 * @param {string} params.outcome - Assignment outcome constant
 * @param {number|null} params.previousAuthorityId - Previous authority ID
 * @param {number|null} params.newAuthorityId - New authority ID
 * @param {string} params.reason - Human-readable reason
 * @param {Object} transaction - Sequelize transaction
 */
async function createAssignmentLog(params, transaction) {
  const {
    reportId,
    userId,
    outcome,
    previousAuthorityId,
    newAuthorityId,
    reason
  } = params;

  // Store assignment data as structured JSON in the comment field
  const assignmentData = JSON.stringify({
    type: LOG_TYPE_ASSIGNMENT,
    outcome,
    previousAuthorityId,
    newAuthorityId,
    reason,
    timestamp: new Date().toISOString()
  });

  await Log.create({
    issue_id: reportId,
    updated_by: userId,
    from_status: previousAuthorityId ? `authority:${previousAuthorityId}` : 'unassigned',
    to_status: newAuthorityId ? `authority:${newAuthorityId}` : 'unassigned',
    comment: assignmentData
  }, { transaction });
}

/**
 * Find matching authority based on assignment criteria
 * 
 * SOFT-DELETE BEHAVIOR:
 * - All Authority queries use paranoid: true (default) - excludes soft-deleted
 * - If no active authority found, we check if ANY authority (including deleted) exists
 *   to differentiate between "no config" vs "all inactive"
 * 
 * @param {Object} criteria - Assignment criteria
 * @param {number} criteria.issueCategoryId - Issue category ID
 * @param {number} criteria.cityId - City ID
 * @param {string} [criteria.region] - Optional region/zone
 * @returns {Promise<{authority: Authority|null, reason: string, outcome: string}>}
 */
async function findMatchingAuthority({ issueCategoryId, cityId, region }) {
  // Step 1: Find authority-issue mappings (active only due to paranoid: true)
  const authorityIssues = await AuthorityIssue.findAll({
    where: { issue_id: issueCategoryId }
  });

  if (authorityIssues.length === 0) {
    return {
      authority: null,
      reason: `No authorities are configured to handle issue category ID ${issueCategoryId}`,
      outcome: ASSIGNMENT_OUTCOMES.UNASSIGNED_NO_MATCHING_AUTHORITY
    };
  }

  const authorityIds = authorityIssues.map(ai => ai.authority_id);

  // Step 2: Build where clause for ACTIVE authority matching
  // paranoid: true is default - only returns non-deleted authorities
  const whereClause = {
    id: { [Op.in]: authorityIds },
    city_id: cityId
  };

  // Step 3: If region is provided, try to match it first (active authorities only)
  if (region && region.trim()) {
    const authorityWithRegion = await Authority.findOne({
      where: {
        ...whereClause,
        region: { [Op.iLike]: region.trim() }
      }
      // paranoid: true is default - excludes soft-deleted
    });

    if (authorityWithRegion) {
      return {
        authority: authorityWithRegion,
        reason: `Matched authority "${authorityWithRegion.name}" for city ID ${cityId}, region "${region}", issue category ${issueCategoryId}`,
        outcome: ASSIGNMENT_OUTCOMES.ASSIGNED
      };
    }
  }

  // Step 4: Fall back to city-only match (any ACTIVE authority in the city)
  const authorityInCity = await Authority.findOne({
    where: whereClause,
    order: [['createdAt', 'ASC']] // Deterministic: pick the oldest active authority
    // paranoid: true is default - excludes soft-deleted
  });

  if (authorityInCity) {
    const matchReason = region
      ? `No authority matched region "${region}", assigned to "${authorityInCity.name}" (city fallback)`
      : `Matched authority "${authorityInCity.name}" for city ID ${cityId}, issue category ${issueCategoryId}`;

    return {
      authority: authorityInCity,
      reason: matchReason,
      outcome: ASSIGNMENT_OUTCOMES.ASSIGNED
    };
  }

  // Step 5: No active authority found - determine if it's "no config" or "all inactive"
  // Check if there ARE authorities that match but are soft-deleted
  const deletedAuthorityCount = await Authority.count(
    withDeletedRecords({
      where: {
        ...whereClause,
        deleted_at: { [Op.ne]: null } // Only count soft-deleted ones
      }
    })
  );

  if (deletedAuthorityCount > 0) {
    // There are matching authorities but they're all inactive
    return {
      authority: null,
      reason: `All authorities for city ID ${cityId} handling issue category ID ${issueCategoryId} are inactive (soft-deleted)`,
      outcome: ASSIGNMENT_OUTCOMES.UNASSIGNED_AUTHORITY_INACTIVE
    };
  }

  // No authorities at all (active or deleted) for this city/issue combination
  return {
    authority: null,
    reason: `No authority in city ID ${cityId} is configured to handle issue category ID ${issueCategoryId}`,
    outcome: ASSIGNMENT_OUTCOMES.UNASSIGNED_NO_MATCHING_AUTHORITY
  };
}

/**
 * Main assignment function
 * 
 * Assigns or reassigns an authority to a report based on deterministic rules.
 * MUST be called within a transaction or will create its own.
 * 
 * @param {Object} params - Assignment parameters
 * @param {number} params.reportId - The report ID to assign
 * @param {number} params.issueCategoryId - Issue category ID
 * @param {number} params.cityId - City ID
 * @param {string} [params.region] - Optional region/zone
 * @param {string} params.triggeredBy - 'system' | 'admin' | 'retry'
 * @param {number} [params.adminUserId] - Required if triggeredBy is 'admin'
 * @param {number} [params.systemUserId] - User ID to use for system-triggered logs
 * @param {number} [params.targetAuthorityId] - For admin reassignment, the target authority
 * @param {Object} [params.transaction] - Optional existing transaction
 * @returns {Promise<{outcome: string, authorityId: number|null, reason: string}>}
 */
async function assignAuthority(params) {
  const {
    reportId,
    issueCategoryId,
    cityId,
    region,
    triggeredBy,
    adminUserId,
    systemUserId,
    targetAuthorityId,
    transaction: externalTransaction
  } = params;

  // Validate required parameters
  if (!reportId) {
    throw httpError('reportId is required for assignment', 400);
  }
  if (!issueCategoryId) {
    throw httpError('issueCategoryId is required for assignment', 400);
  }
  if (!cityId) {
    throw httpError('cityId is required for assignment', 400);
  }
  if (!triggeredBy || !Object.values(TRIGGER_TYPES).includes(triggeredBy)) {
    throw httpError(`triggeredBy must be one of: ${Object.values(TRIGGER_TYPES).join(', ')}`, 400);
  }
  if (triggeredBy === TRIGGER_TYPES.ADMIN && !adminUserId) {
    throw httpError('adminUserId is required for admin-triggered assignments', 400);
  }

  // Determine the user ID for logging
  const logUserId = triggeredBy === TRIGGER_TYPES.ADMIN 
    ? adminUserId 
    : (systemUserId || 1); // Default to system user ID 1 if not provided

  // Execute within transaction
  const executeAssignment = async (transaction) => {
    // Fetch the current report
    const report = await UserIssue.findByPk(reportId, { transaction });
    if (!report) {
      throw httpError(`Report ID ${reportId} not found`, 404);
    }

    const previousAuthorityId = report.authority_id;

    // Handle admin reassignment
    if (triggeredBy === TRIGGER_TYPES.ADMIN && targetAuthorityId !== undefined) {
      return handleAdminReassignment({
        report,
        targetAuthorityId,
        cityId,
        previousAuthorityId,
        logUserId,
        transaction
      });
    }

    // Auto-assignment logic (uses paranoid: true, excludes soft-deleted authorities)
    const { authority, reason, outcome: matchOutcome } = await findMatchingAuthority({
      issueCategoryId,
      cityId,
      region
    });

    if (!authority) {
      // Use the outcome determined by findMatchingAuthority
      const outcome = matchOutcome;

      // Update report to have no authority
      await report.update({ authority_id: null }, { transaction });

      // Log the unassigned outcome
      await createAssignmentLog({
        reportId,
        userId: logUserId,
        outcome,
        previousAuthorityId,
        newAuthorityId: null,
        reason
      }, transaction);

      return {
        outcome,
        authorityId: null,
        reason
      };
    }

    // Assignment successful
    await report.update({ authority_id: authority.id }, { transaction });

    await createAssignmentLog({
      reportId,
      userId: logUserId,
      outcome: ASSIGNMENT_OUTCOMES.ASSIGNED,
      previousAuthorityId,
      newAuthorityId: authority.id,
      reason
    }, transaction);

    return {
      outcome: ASSIGNMENT_OUTCOMES.ASSIGNED,
      authorityId: authority.id,
      reason
    };
  };

  // Use existing transaction or create new one
  if (externalTransaction) {
    return executeAssignment(externalTransaction);
  }

  return sequelize.transaction(executeAssignment);
}

/**
 * Handle admin reassignment
 * 
 * @param {Object} params
 * @param {UserIssue} params.report - The report instance
 * @param {number|null} params.targetAuthorityId - Target authority ID (null to unassign)
 * @param {number} params.cityId - City ID for validation
 * @param {number|null} params.previousAuthorityId - Previous authority ID
 * @param {number} params.logUserId - Admin user ID for logging
 * @param {Object} params.transaction - Sequelize transaction
 */
async function handleAdminReassignment({
  report,
  targetAuthorityId,
  cityId,
  previousAuthorityId,
  logUserId,
  transaction
}) {
  // If targetAuthorityId is null, admin is explicitly unassigning
  if (targetAuthorityId === null) {
    await report.update({ authority_id: null }, { transaction });

    const reason = 'Admin explicitly unassigned authority';

    await createAssignmentLog({
      reportId: report.id,
      userId: logUserId,
      outcome: ASSIGNMENT_OUTCOMES.REASSIGNED_BY_ADMIN,
      previousAuthorityId,
      newAuthorityId: null,
      reason
    }, transaction);

    return {
      outcome: ASSIGNMENT_OUTCOMES.REASSIGNED_BY_ADMIN,
      authorityId: null,
      reason
    };
  }

  // Validate target authority exists and is ACTIVE
  // findByPk with paranoid: true (default) returns null if soft-deleted
  const targetAuthority = await Authority.findByPk(targetAuthorityId, { transaction });
  
  if (!targetAuthority) {
    // Could be non-existent OR soft-deleted - check which
    const deletedAuthority = await Authority.findByPk(
      targetAuthorityId,
      withDeletedRecords({ transaction })
    );

    if (deletedAuthority && !isActive(deletedAuthority)) {
      throw httpError(
        `Authority "${deletedAuthority.name}" is inactive and cannot be assigned`,
        400
      );
    }
    
    throw httpError(`Authority ID ${targetAuthorityId} not found`, 404);
  }

  if (targetAuthority.city_id !== cityId) {
    throw httpError(
      `Authority "${targetAuthority.name}" belongs to a different city. Cross-city reassignment is not allowed.`,
      400
    );
  }

  // No need to check deleted_at - paranoid: true already excludes soft-deleted

  // Perform reassignment
  await report.update({ authority_id: targetAuthorityId }, { transaction });

  const reason = `Admin reassigned to authority "${targetAuthority.name}" (ID: ${targetAuthorityId})`;

  await createAssignmentLog({
    reportId: report.id,
    userId: logUserId,
    outcome: ASSIGNMENT_OUTCOMES.REASSIGNED_BY_ADMIN,
    previousAuthorityId,
    newAuthorityId: targetAuthorityId,
    reason
  }, transaction);

  return {
    outcome: ASSIGNMENT_OUTCOMES.REASSIGNED_BY_ADMIN,
    authorityId: targetAuthorityId,
    reason
  };
}

/**
 * Reassign authority for a report (admin-only operation)
 * 
 * @param {Object} params
 * @param {number} params.reportId - Report ID
 * @param {number|null} params.targetAuthorityId - New authority ID or null to unassign
 * @param {number} params.adminUserId - Admin performing the reassignment
 * @returns {Promise<{outcome: string, authorityId: number|null, reason: string}>}
 */
async function reassignAuthority({ reportId, targetAuthorityId, adminUserId }) {
  if (!reportId) {
    throw httpError('reportId is required', 400);
  }
  if (!adminUserId) {
    throw httpError('adminUserId is required', 400);
  }

  return sequelize.transaction(async (transaction) => {
    const report = await UserIssue.findByPk(reportId, { transaction });
    if (!report) {
      throw httpError(`Report ID ${reportId} not found`, 404);
    }

    // Get the city_id from the report
    const cityId = report.city_id;
    if (!cityId) {
      throw httpError('Report has no city_id, cannot validate reassignment', 400);
    }

    return handleAdminReassignment({
      report,
      targetAuthorityId,
      cityId,
      previousAuthorityId: report.authority_id,
      logUserId: adminUserId,
      transaction
    });
  });
}

/**
 * Retry assignment for unassigned reports
 * Useful for batch operations after authority configuration changes
 * 
 * @param {Object} params
 * @param {number} params.reportId - Report ID
 * @param {number} params.adminUserId - Admin triggering the retry
 * @returns {Promise<{outcome: string, authorityId: number|null, reason: string}>}
 */
async function retryAssignment({ reportId, adminUserId }) {
  if (!reportId) {
    throw httpError('reportId is required', 400);
  }

  return sequelize.transaction(async (transaction) => {
    const report = await UserIssue.findByPk(reportId, { transaction });
    if (!report) {
      throw httpError(`Report ID ${reportId} not found`, 404);
    }

    if (!report.city_id) {
      throw httpError('Report has no city_id, cannot perform assignment', 400);
    }

    return assignAuthority({
      reportId,
      issueCategoryId: report.issue_id,
      cityId: report.city_id,
      region: report.region,
      triggeredBy: TRIGGER_TYPES.RETRY,
      systemUserId: adminUserId || 1,
      transaction
    });
  });
}

/**
 * Get assignment history for a report
 * 
 * @param {number} reportId - Report ID
 * @returns {Promise<Array>} Assignment log entries
 */
async function getAssignmentHistory(reportId) {
  const logs = await Log.findAll({
    where: {
      issue_id: reportId,
      [Op.or]: [
        { from_status: { [Op.like]: 'authority:%' } },
        { to_status: { [Op.like]: 'authority:%' } },
        { from_status: 'unassigned' },
        { to_status: 'unassigned' }
      ]
    },
    order: [['createdAt', 'ASC']]
  });

  return logs.map(log => {
    let assignmentData = null;
    try {
      assignmentData = JSON.parse(log.comment);
    } catch {
      // Not an assignment log or malformed JSON
    }

    return {
      id: log.id,
      createdAt: log.createdAt,
      fromStatus: log.from_status,
      toStatus: log.to_status,
      assignmentData
    };
  });
}

module.exports = {
  // Constants
  ASSIGNMENT_OUTCOMES,
  TRIGGER_TYPES,

  // Main functions
  assignAuthority,
  reassignAuthority,
  retryAssignment,

  // Utilities
  findMatchingAuthority,
  getAssignmentHistory,
  createAssignmentLog
};
