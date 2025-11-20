const IssueService = require("./issue.service.js");

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
      const report = await IssueService.createReport(
        req.user.id,
        req.body,
        req.files || []
      );

      return res.status(201).json({
        success: true,
        message: "Issue reported successfully.",
        data: { report }
      });
    } catch (err) {
      next(err);
    }
  },

  async listReports(req, res, next) {
    try {
      const reports = await IssueService.listReports(req.user, req.query);

      return res.status(200).json({
        success: true,
        data: { 
          reports,
          count: reports.length,
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
      const reports = await IssueService.listFlaggedReports();

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
  }
};
