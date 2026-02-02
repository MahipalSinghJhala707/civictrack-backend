const { Op } = require("sequelize");
const {
  Issue,
  UserIssue,
  IssueImage,
  Authority,
  AuthorityUser,
  UserIssueFlag,
  Flag,
  Log,
  User,
  City,
  sequelize
} = require("../../models");
const { uploadIssueImages } = require("./issue.s3.service.js");
const httpError = require("../../shared/utils/httpError.js");
const { validateCityScope, applyCityFilter, buildParanoidOptions } = require("../../shared/utils/cityScope.js");
const {
  buildQueryOptions,
  buildPaginatedResponse
} = require("../../shared/utils/pagination.js");
const {
  assignAuthority,
  reassignAuthority,
  retryAssignment,
  getAssignmentHistory,
  ASSIGNMENT_OUTCOMES,
  TRIGGER_TYPES
} = require("./assignment.service.js");

const parseNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * Base includes for report queries
 * 
 * SOFT-DELETE BEHAVIOR:
 * - All models use paranoid: true - soft-deleted records are excluded by default
 * - required: false on optional relations allows null if related entity was soft-deleted
 * - This ensures reports with deleted authorities/reporters still appear (with null relations)
 */
const baseReportInclude = [
  {
    model: Issue,
    as: "issue",
    attributes: ["id", "name", "slug"],
    required: false // Allow null if issue category was soft-deleted
    // paranoid: true is default
  },
  {
    model: Authority,
    as: "authority",
    attributes: ["id", "name", "city", "region", "city_id"],
    required: false // Allow null if authority was soft-deleted or unassigned
    // paranoid: true is default - soft-deleted authorities return null
  },
  {
    model: User,
    as: "reporter",
    attributes: ["id", "name", "email"],
    required: false // Allow null if reporter was soft-deleted
    // paranoid: true is default
  },
  {
    model: City,
    as: "city",
    attributes: ["id", "name", "state"],
    required: false
    // paranoid: true is default
  },
  {
    model: IssueImage,
    as: "images",
    attributes: ["id", "url"],
    required: false,
    separate: false
    // paranoid: true is default - soft-deleted images excluded
  },
  {
    model: Log,
    as: "logs",
    attributes: ["id", "from_status", "to_status", "comment", "updated_by", "createdAt"],
    required: false
    // paranoid: true is default
  }
];

/**
 * Flag include for report queries
 * 
 * SOFT-DELETE BEHAVIOR:
 * - Soft-deleted flags are excluded from the response
 * - Soft-deleted user-issue-flag records are excluded
 */
const flagInclude = {
  model: UserIssueFlag,
  as: "flags",
  attributes: ["id", "flag_id", "user_id", "createdAt"],
  required: false, // Reports without flags still returned
  // paranoid: true is default - soft-deleted flag records excluded
  include: [
    {
      model: Flag,
      as: "flag",
      attributes: ["id", "name"],
      required: false // Allow null if flag type was soft-deleted
      // paranoid: true is default
    }
  ]
};

// Use shared httpError utility instead of duplicate helpers
const toNotFoundError = (message) => httpError(message, 404);
const toForbiddenError = (message) => httpError(message, 403);
const toConflictError = (message) => httpError(message, 409);

module.exports = {
  async listCategories() {
    return Issue.findAll({
      order: [["name", "ASC"]],
      attributes: ["id", "name", "slug", "description"]
    });
  },

  async listFlags() {
    return Flag.findAll({
      order: [["name", "ASC"]],
      attributes: ["id", "name", "description"]
    });
  },

  async createReport(userId, payload, files = []) {
    const {
      title,
      description,
      issueId,
      latitude,
      longitude,
      region,
      city,       // City name (string)
      cityId,     // City ID (optional, preferred over city name)
      imageUrls = []
    } = payload;

    // Convert issueId to number (form data sends as string)
    const issueIdNum = parseNumber(issueId);
    if (!issueIdNum) {
      throw httpError("A valid issue category is required.", 422);
    }

    const issueCategory = await Issue.findByPk(issueIdNum);
    if (!issueCategory) {
      throw toNotFoundError("Selected issue category does not exist.");
    }

    // Resolve city_id: prefer explicit cityId, otherwise look up by name
    let resolvedCityId = parseNumber(cityId);
    if (!resolvedCityId && city) {
      const cityRecord = await City.findOne({
        where: { name: { [Op.iLike]: String(city).trim() } }
      });
      resolvedCityId = cityRecord ? cityRecord.id : null;
    }

    const providedImageUrls = Array.isArray(imageUrls)
      ? imageUrls
      : imageUrls
        ? [imageUrls]
        : [];

    const sanitizedProvidedUrls = providedImageUrls
      .filter(Boolean)
      .map((url) => String(url).trim());

    // Handle file uploads with error handling
    // Images are optional - if upload fails, report can still be created
    let uploadedImageUrls = [];
    if (files && files.length > 0) {
      try {
        uploadedImageUrls = await uploadIssueImages(files);
      } catch (s3Error) {
        // Log S3 error details for debugging
        console.error("S3 upload error:", {
          message: s3Error.message,
          code: s3Error.code,
          name: s3Error.name,
          stack: s3Error.stack
        });
        
        // Log warning but continue - images are optional
        console.warn("S3 upload failed. Report will be created without uploaded images.");
        uploadedImageUrls = [];
        
        // Check if we have any image URLs at all (provided or uploaded)
        // If no images at all, we still allow the report to be created (images are optional)
        // Only log a warning about missing images
        if (sanitizedProvidedUrls.length === 0) {
          console.warn("No images will be attached to this report (S3 upload failed and no provided URLs)");
        }
      }
    }

    const allImageUrls = [...sanitizedProvidedUrls, ...uploadedImageUrls];

    return sequelize.transaction(async (transaction) => {
      // Create the report initially without authority (will be assigned by the engine)
      const report = await UserIssue.create(
        {
          title,
          description,
          issue_id: issueIdNum,
          reporter_id: userId,
          authority_id: null, // Will be set by assignment engine
          latitude: latitude ? parseNumber(latitude) : null,
          longitude: longitude ? parseNumber(longitude) : null,
          region: region ? String(region).trim() : null,
          city_id: resolvedCityId
        },
        { transaction }
      );

      if (allImageUrls.length) {
        const imagesPayload = allImageUrls.map((url) => ({
          report_id: report.id,
          url
        }));
        await IssueImage.bulkCreate(imagesPayload, { transaction });
      }

      // Log the initial report creation
      await Log.create(
        {
          issue_id: report.id,
          updated_by: userId,
          from_status: null,
          to_status: "reported",
          comment: "Issue reported"
        },
        { transaction }
      );

      // Use the deterministic assignment engine
      // This handles all assignment outcomes and logging internally
      let assignmentResult = { outcome: null, authorityId: null, reason: 'Assignment skipped' };
      
      if (resolvedCityId && issueIdNum) {
        try {
          assignmentResult = await assignAuthority({
            reportId: report.id,
            issueCategoryId: issueIdNum,
            cityId: resolvedCityId,
            region: region ? String(region).trim() : null,
            triggeredBy: TRIGGER_TYPES.SYSTEM,
            systemUserId: userId,
            transaction
          });
        } catch (assignmentError) {
          // Log but don't fail report creation - assignment can be retried
          console.error("Authority assignment failed:", assignmentError.message);
          assignmentResult = {
            outcome: ASSIGNMENT_OUTCOMES.UNASSIGNED_CONFIGURATION_ERROR,
            authorityId: null,
            reason: `Assignment error: ${assignmentError.message}`
          };
        }
      } else {
        // Cannot assign without city_id
        assignmentResult = {
          outcome: ASSIGNMENT_OUTCOMES.UNASSIGNED_CONFIGURATION_ERROR,
          authorityId: null,
          reason: 'Cannot assign authority without city_id'
        };
      }

      // Fetch the final report with all associations
      const finalReport = await UserIssue.findByPk(report.id, {
        include: [...baseReportInclude, flagInclude],
        transaction
      });

      // Attach assignment metadata to the response
      finalReport.dataValues.assignmentResult = assignmentResult;

      return finalReport;
    });
  },

  /**
   * List reports with mandatory pagination and ordering
   * 
   * SOFT-DELETE BEHAVIOR:
   * - By default, excludes soft-deleted reports (paranoid: true)
   * - If adminContext.includeDeleted is true, includes soft-deleted reports
   *   (for admin audit/diagnostic purposes only)
   * 
   * @param {Object} user - Current user
   * @param {Object} filters - Query filters (status, issueId, region, myIssues)
   * @param {Object} adminContext - { adminCityId, includeAllCities, includeDeleted }
   * @param {Object} pagination - { page, limit, offset, sortBy, sortOrder, entityType }
   * @returns {Promise<{data: Array, meta: Object}>}
   */
  async listReports(user, filters = {}, adminContext = null, pagination = {}) {
    const whereClause = {};

    const status = filters.status;
    if (status) {
      whereClause.status = status;
    }

    const issueIdFilter = parseNumber(filters.issueId);
    if (issueIdFilter) {
      whereClause.issue_id = issueIdFilter;
    }

    if (filters.region) {
      whereClause.region = {
        [Op.iLike]: `${filters.region}%`
      };
    }

    // Default paranoid options (only admins can override)
    let paranoidOptions = {};

    if (user.role === "citizen") {
      // Citizens can see all public issues (not hidden)
      // Optionally filter by region if provided
      whereClause.is_hidden = false;
      
      // If user wants to see only their own issues, they can filter by reporter_id
      // Otherwise, show all public issues
      if (filters.myIssues === "true" || filters.myIssues === true) {
        whereClause.reporter_id = user.id;
      }
    } else if (user.role === "authority") {
      const authorityUser = await AuthorityUser.findOne({
        where: { user_id: user.id }
      });
      if (!authorityUser) {
        throw toForbiddenError("Authority mapping missing for this account.");
      }
      whereClause.authority_id = authorityUser.authority_id;
    } else if (user.role === "admin") {
      // Admin queries are city-scoped by default
      if (adminContext) {
        validateCityScope(adminContext);
        const cityFilter = applyCityFilter({}, adminContext, 'city_id');
        Object.assign(whereClause, cityFilter);
        // Admin can request to see deleted records
        paranoidOptions = buildParanoidOptions(adminContext);
      }
    } else {
      throw toForbiddenError("Unsupported role for listing issues.");
    }

    // Build pagination options (defaults applied if not provided)
    const paginationOptions = buildQueryOptions({
      ...pagination,
      entityType: 'issues'
    });

    const { rows, count } = await UserIssue.findAndCountAll({
      where: whereClause,
      include: [...baseReportInclude, flagInclude],
      ...paginationOptions,
      ...paranoidOptions, // Apply paranoid options (only for admin with includeDeleted)
      distinct: true
    });

    return buildPaginatedResponse(rows, count, {
      page: pagination.page || 1,
      limit: pagination.limit || 20
    });
  },

  async getReportById(reportId, user) {
    const report = await UserIssue.findByPk(reportId, {
      include: [...baseReportInclude, flagInclude]
    });

    if (!report) {
      throw toNotFoundError("Issue report not found.");
    }

    if (user.role === "citizen") {
      if (report.is_hidden && report.reporter_id !== user.id) {
        throw toForbiddenError("You do not have access to this report.");
      }
      return report;
    } else if (user.role === "authority") {
      const authorityUser = await AuthorityUser.findOne({
        where: { user_id: user.id }
      });
      if (!authorityUser || authorityUser.authority_id !== report.authority_id) {
        throw toForbiddenError("You do not have access to this report.");
      }
      return report;
    } else if (user.role === "admin") {
      return report;
    } else {
      throw toForbiddenError("Unsupported role for accessing reports.");
    }
  },

  async updateStatus(reportId, { status, comment }, user) {
    const report = await UserIssue.findByPk(reportId);
    if (!report) {
      throw toNotFoundError("Issue report not found.");
    }

    if (user.role === "authority") {
      const authorityUser = await AuthorityUser.findOne({
        where: { user_id: user.id }
      });
      if (!authorityUser || authorityUser.authority_id !== report.authority_id) {
        throw toForbiddenError("You cannot update issues outside your department.");
      }
    } else if (user.role !== "admin") {
      throw toForbiddenError("Only authority or admin can update the issue status.");
    }

    return sequelize.transaction(async (transaction) => {
      const previousStatus = report.status;

      await report.update({ status }, { transaction });

      await Log.create(
        {
          issue_id: report.id,
          updated_by: user.id,
          from_status: previousStatus,
          to_status: status,
          comment: comment || null
        },
        { transaction }
      );

      return UserIssue.findByPk(report.id, {
        include: [...baseReportInclude, flagInclude],
        transaction
      });
    });
  },

  async flagReport(reportId, { flagId }, user) {
    const report = await UserIssue.findByPk(reportId);
    if (!report) {
      throw toNotFoundError("Issue report not found.");
    }

    const flag = await Flag.findByPk(flagId);
    if (!flag) {
      throw toNotFoundError("Selected flag reason does not exist.");
    }

    return sequelize.transaction(async (transaction) => {
      // Check if user has already flagged this report
      const existingFlag = await UserIssueFlag.findOne({
        where: { report_id: reportId, user_id: user.id },
        transaction
      });

      if (existingFlag) {
        // If user has already flagged, delete the old flag (hard delete)
        // This allows citizens to change their flag reason
        await UserIssueFlag.destroy({
          where: { report_id: reportId, user_id: user.id },
          force: true, // Hard delete to bypass soft delete
          transaction
        });
      }

      // Create the new flag (or re-create if it was just deleted)
      await UserIssueFlag.create(
        {
          report_id: reportId,
          user_id: user.id,
          flag_id: flagId
        },
        { transaction }
      );

      // Note: Reports are NOT automatically hidden based on flag count
      // Only admins can manually hide/unhide reports

      return UserIssue.findByPk(report.id, {
        include: [...baseReportInclude, flagInclude],
        transaction
      });
    });
  },

  /**
   * List flagged reports with city scoping and mandatory pagination
   * 
   * SOFT-DELETE BEHAVIOR:
   * - By default, excludes soft-deleted reports (paranoid: true)
   * - If adminContext.includeDeleted is true, includes soft-deleted reports
   *   (for admin audit/diagnostic purposes only)
   * 
   * @param {Object} adminContext - { adminCityId, includeAllCities, includeDeleted }
   * @param {Object} pagination - { page, limit, offset, sortBy, sortOrder, entityType }
   * @returns {Promise<{data: Array, meta: Object}>}
   */
  async listFlaggedReports(adminContext = {}, pagination = {}) {
    validateCityScope(adminContext);
    
    const whereClause = applyCityFilter({}, adminContext, 'city_id');
    const paranoidOptions = buildParanoidOptions(adminContext);
    
    // Build pagination options (defaults applied if not provided)
    const paginationOptions = buildQueryOptions({
      ...pagination,
      entityType: 'flaggedReports'
    });

    const { rows, count } = await UserIssue.findAndCountAll({
      where: whereClause,
      include: [
        ...baseReportInclude,
        {
          ...flagInclude,
          required: true
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

  async toggleReportVisibility(reportId, isHidden) {
    const report = await UserIssue.findByPk(reportId);
    if (!report) {
      throw toNotFoundError("Issue report not found.");
    }

    await report.update({ is_hidden: isHidden });

    return UserIssue.findByPk(report.id, {
      include: [...baseReportInclude, flagInclude]
    });
  },

  /**
   * Reassign authority for a report (admin-only)
   * 
   * @param {number} reportId - Report ID
   * @param {number|null} targetAuthorityId - New authority ID (null to unassign)
   * @param {number} adminUserId - Admin user performing the action
   * @returns {Promise<{report: UserIssue, assignmentResult: Object}>}
   */
  async reassignReportAuthority(reportId, targetAuthorityId, adminUserId) {
    const assignmentResult = await reassignAuthority({
      reportId,
      targetAuthorityId,
      adminUserId
    });

    const report = await UserIssue.findByPk(reportId, {
      include: [...baseReportInclude, flagInclude]
    });

    return { report, assignmentResult };
  },

  /**
   * Retry automatic assignment for an unassigned report (admin-only)
   * Useful after authority configuration changes
   * 
   * @param {number} reportId - Report ID
   * @param {number} adminUserId - Admin user triggering retry
   * @returns {Promise<{report: UserIssue, assignmentResult: Object}>}
   */
  async retryReportAssignment(reportId, adminUserId) {
    const assignmentResult = await retryAssignment({
      reportId,
      adminUserId
    });

    const report = await UserIssue.findByPk(reportId, {
      include: [...baseReportInclude, flagInclude]
    });

    return { report, assignmentResult };
  },

  /**
   * Get assignment history for a report
   * 
   * @param {number} reportId - Report ID
   * @returns {Promise<Array>} Assignment log entries
   */
  async getReportAssignmentHistory(reportId) {
    const report = await UserIssue.findByPk(reportId);
    if (!report) {
      throw toNotFoundError("Issue report not found.");
    }

    return getAssignmentHistory(reportId);
  },

  // Re-export assignment constants for controllers
  ASSIGNMENT_OUTCOMES,
  TRIGGER_TYPES
};
