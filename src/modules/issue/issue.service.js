const { Op } = require("sequelize");
const {
  Issue,
  UserIssue,
  IssueImage,
  Authority,
  AuthorityUser,
  AuthorityIssue,
  UserIssueFlag,
  Flag,
  Log,
  User,
  sequelize
} = require("../../models");
const { uploadIssueImages } = require("./issue.s3.service.js");
const httpError = require("../../shared/utils/httpError.js");
const { validateCityScope, applyCityFilter } = require("../../shared/utils/cityScope.js");

const parseNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * Automatically assign authority to an issue based on strict matching:
 * All three conditions must match:
 * 1. Issue category (issue_id) - via AuthorityIssue mapping
 * 2. Region (zone) - must match authority's region
 * 3. City - must match authority's city
 * 
 * @param {number} issueId - The issue category ID
 * @param {string} region - Region/zone name (required)
 * @param {string} city - City name (required)
 * @returns {Promise<Authority|null>} - The assigned authority or null if no match
 */
const autoAssignAuthority = async (issueId, region, city) => {
  // All three parameters are required for assignment
  if (!issueId || !region || !city) {
    return null;
  }

  // Find authorities mapped to this issue category via AuthorityIssue junction table
  const authorityIssues = await AuthorityIssue.findAll({
    where: { issue_id: issueId }
  });

  if (authorityIssues.length === 0) {
    return null;
  }

  // Extract authority IDs from the mappings
  const authorityIds = authorityIssues.map(ai => ai.authority_id);

  // Find the authority that matches all three conditions:
  // 1. Is mapped to this issue category (via AuthorityIssue)
  // 2. Region matches (case-insensitive)
  // 3. City matches (case-insensitive)
  const matchingAuthority = await Authority.findOne({
    where: {
      id: {
        [Op.in]: authorityIds
      },
      region: {
        [Op.iLike]: region.trim()
      },
      city: {
        [Op.iLike]: city.trim()
      }
    }
  });

  return matchingAuthority || null;
};

const baseReportInclude = [
  {
    model: Issue,
    as: "issue",
    attributes: ["id", "name", "slug"]
  },
  {
    model: Authority,
    as: "authority",
    attributes: ["id", "name", "city", "region"]
  },
  {
    model: User,
    as: "reporter",
    attributes: ["id", "name", "email"]
  },
  {
    model: IssueImage,
    as: "images",
    attributes: ["id", "url"],
    required: false,
    separate: false
  },
  {
    model: Log,
    as: "logs",
    attributes: ["id", "from_status", "to_status", "comment", "updated_by", "createdAt"]
  }
];

const flagInclude = {
  model: UserIssueFlag,
  as: "flags",
  attributes: ["id", "flag_id", "user_id", "createdAt"],
  include: [
    {
      model: Flag,
      as: "flag",
      attributes: ["id", "name"]
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
      city,
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

    // Auto-assign authority based on strict matching: issue_id, region, and city
    // All three must match for assignment
    const authorityRecord = await autoAssignAuthority(issueIdNum, region, city);
    // If auto-assignment fails, authorityRecord will be null (issue can still be created)

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
      const report = await UserIssue.create(
        {
          title,
          description,
          issue_id: issueIdNum,
          reporter_id: userId,
          authority_id: authorityRecord ? authorityRecord.id : null,
          latitude: latitude ? parseNumber(latitude) : null,
          longitude: longitude ? parseNumber(longitude) : null,
          region: region ? String(region).trim() : null
          // Note: city is not stored in user_issue table, only used for authority matching
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

      return UserIssue.findByPk(report.id, {
        include: [...baseReportInclude, flagInclude],
        transaction
      });
    });
  },

  async listReports(user, filters = {}, adminContext = null) {
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
      }
    } else {
      throw toForbiddenError("Unsupported role for listing issues.");
    }

    return UserIssue.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      include: [...baseReportInclude, flagInclude]
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
   * List flagged reports with city scoping for admin
   * @param {Object} adminContext - { adminCityId, includeAllCities }
   */
  async listFlaggedReports(adminContext = {}) {
    validateCityScope(adminContext);
    
    const whereClause = applyCityFilter({}, adminContext, 'city_id');
    
    return UserIssue.findAll({
      where: whereClause,
      include: [
        ...baseReportInclude,
        {
          ...flagInclude,
          required: true
        }
      ],
      order: [["updatedAt", "DESC"]]
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
  }
};
