const IssueService = require("./issue.service.js");
const { extractAdminContext } = require("../../shared/utils/cityScope.js");

module.exports = {
  async listCategories(req, res, next) {
    try {
      const categories = await IssueService.listCategories();

      return res.status(200).json({
        success: true,
        data: { categories }
      });
    } catch (err) {
      next(err);
    }
  },

  async listFlags(req, res, next) {
    try {
      const flags = await IssueService.listFlags();

      return res.status(200).json({
        success: true,
        data: { flags }
      });
    } catch (err) {
      next(err);
    }
  },

  async createReport(req, res, next) {
    try {
      // Ensure files array is properly formatted
      const files = Array.isArray(req.files) ? req.files : (req.files ? [req.files] : []);
      
      const report = await IssueService.createReport(
        req.user.id,
        req.body,
        files
      );

      // Ensure images array is always present
      const reportData = report.toJSON ? report.toJSON() : report;
      if (!reportData.images || !Array.isArray(reportData.images)) {
        reportData.images = [];
      }

      return res.status(201).json({
        success: true,
        message: "Issue reported successfully.",
        data: { report: reportData }
      });
    } catch (err) {
      next(err);
    }
  },

  async listReports(req, res, next) {
    try {
      // Pass admin context only for admin users
      const adminContext = req.user.role === 'admin' ? extractAdminContext(req) : null;
      const reports = await IssueService.listReports(req.user, req.query, adminContext);

      // Ensure images array is always present for each report
      const reportsWithImages = reports.map(report => {
        const reportData = report.toJSON ? report.toJSON() : report;
        // Ensure images is always an array
        if (!reportData.images || !Array.isArray(reportData.images)) {
          reportData.images = [];
        }
        return reportData;
      });

      return res.status(200).json({
        success: true,
        data: { 
          reports: reportsWithImages,
          count: reportsWithImages.length,
          user: {
            id: req.user.id,
            role: req.user.role
          }
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async getReportById(req, res, next) {
    try {
      const reportId = Number(req.params.reportId);
      const report = await IssueService.getReportById(reportId, req.user);

      // Ensure images array is always present
      const reportData = report.toJSON ? report.toJSON() : report;
      if (!reportData.images || !Array.isArray(reportData.images)) {
        reportData.images = [];
      }

      return res.status(200).json({
        success: true,
        data: { report: reportData }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const reportId = Number(req.params.reportId);
      const report = await IssueService.updateStatus(reportId, req.body, req.user);

      return res.status(200).json({
        success: true,
        message: "Issue status updated.",
        data: { report }
      });
    } catch (err) {
      next(err);
    }
  },

  async flagReport(req, res, next) {
    try {
      const reportId = Number(req.params.reportId);
      const report = await IssueService.flagReport(reportId, req.body, req.user);

      return res.status(200).json({
        success: true,
        message: "Issue flagged for review.",
        data: { report }
      });
    } catch (err) {
      next(err);
    }
  },

  async listFlaggedReports(req, res, next) {
    try {
      const adminContext = extractAdminContext(req);
      const reports = await IssueService.listFlaggedReports(adminContext);

      return res.status(200).json({
        success: true,
        data: { reports }
      });
    } catch (err) {
      next(err);
    }
  },

  async toggleReportVisibility(req, res, next) {
    try {
      const reportId = Number(req.params.reportId);
      const { isHidden } = req.body;
      const report = await IssueService.toggleReportVisibility(reportId, isHidden);

      return res.status(200).json({
        success: true,
        message: `Report ${isHidden ? "hidden" : "unhidden"} successfully.`,
        data: { report }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Reassign authority for a report (admin-only)
   * POST /issues/:reportId/reassign
   * Body: { authorityId: number | null }
   */
  async reassignAuthority(req, res, next) {
    try {
      const reportId = Number(req.params.reportId);
      const { authorityId } = req.body;

      // authorityId can be null (to unassign) or a valid number
      const targetAuthorityId = authorityId === null || authorityId === undefined
        ? null
        : Number(authorityId);

      const { report, assignmentResult } = await IssueService.reassignReportAuthority(
        reportId,
        targetAuthorityId,
        req.user.id
      );

      return res.status(200).json({
        success: true,
        message: assignmentResult.reason,
        data: {
          report,
          assignmentResult: {
            outcome: assignmentResult.outcome,
            authorityId: assignmentResult.authorityId,
            reason: assignmentResult.reason
          }
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Retry automatic assignment for an unassigned report (admin-only)
   * POST /issues/:reportId/retry-assignment
   */
  async retryAssignment(req, res, next) {
    try {
      const reportId = Number(req.params.reportId);

      const { report, assignmentResult } = await IssueService.retryReportAssignment(
        reportId,
        req.user.id
      );

      const wasAssigned = assignmentResult.outcome === IssueService.ASSIGNMENT_OUTCOMES.ASSIGNED;

      return res.status(200).json({
        success: wasAssigned,
        message: assignmentResult.reason,
        data: {
          report,
          assignmentResult: {
            outcome: assignmentResult.outcome,
            authorityId: assignmentResult.authorityId,
            reason: assignmentResult.reason
          }
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get assignment history for a report
   * GET /issues/:reportId/assignment-history
   */
  async getAssignmentHistory(req, res, next) {
    try {
      const reportId = Number(req.params.reportId);
      const history = await IssueService.getReportAssignmentHistory(reportId);

      return res.status(200).json({
        success: true,
        data: {
          reportId,
          assignmentHistory: history
        }
      });
    } catch (err) {
      next(err);
    }
  }
};
