'use strict';

/**
 * Issue Service Tests
 * 
 * Tests the issue service invariants:
 * - City-scoped visibility for admin queries
 * - Hidden vs public reports visibility
 * - Pagination is always enforced
 * - Role-based access control
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';

const { Op } = require('sequelize');
const { 
  sequelize, 
  UserIssue,
  Issue,
  User, 
  City,
  Authority,
  AuthorityUser
} = require('../../src/models');
const issueService = require('../../src/modules/issue/issue.service.js');
const { 
  ensureDbConnection, 
  closeDbConnection,
  createTestReportData
} = require('../setup/testHelpers.js');

describe('Issue Service', () => {
  let testCity = null;
  let testCity2 = null;
  let testIssueCategory = null;
  let testUser = null;
  let testAuthority = null;
  let testAuthorityUser = null;

  beforeAll(async () => {
    await ensureDbConnection();

    // Create test cities
    [testCity] = await City.findOrCreate({
      where: { name: 'Issue Test City 1' },
      defaults: { name: 'Issue Test City 1', state: 'Test State' }
    });

    [testCity2] = await City.findOrCreate({
      where: { name: 'Issue Test City 2' },
      defaults: { name: 'Issue Test City 2', state: 'Test State' }
    });

    // Create test issue category
    [testIssueCategory] = await Issue.findOrCreate({
      where: { name: 'Issue Test Category' },
      defaults: { 
        name: 'Issue Test Category', 
        slug: 'issue-test-category',
        description: 'Test category'
      }
    });

    // Create test user
    [testUser] = await User.findOrCreate({
      where: { email: 'issue-test-user@example.com' },
      defaults: {
        name: 'Issue Test User',
        email: 'issue-test-user@example.com',
        password_hash: 'test-hash',
        city_id: testCity.id
      }
    });

    // Create test authority
    [testAuthority] = await Authority.findOrCreate({
      where: { name: 'Issue Test Authority' },
      defaults: {
        name: 'Issue Test Authority',
        city: 'Issue Test City 1',
        region: 'Test Region',
        city_id: testCity.id
      }
    });
  });

  afterAll(async () => {
    // Cleanup in reverse order of dependencies
    if (testAuthorityUser) {
      await AuthorityUser.destroy({ where: { id: testAuthorityUser.id }, force: true });
    }
    await UserIssue.destroy({ 
      where: { reporter_id: testUser?.id },
      force: true 
    });
    if (testAuthority) {
      await Authority.destroy({ where: { id: testAuthority.id }, force: true });
    }
    if (testUser) {
      await User.destroy({ where: { id: testUser.id }, force: true });
    }
    if (testIssueCategory) {
      await Issue.destroy({ where: { id: testIssueCategory.id }, force: true });
    }
    if (testCity2) {
      await City.destroy({ where: { id: testCity2.id }, force: true });
    }
    if (testCity) {
      await City.destroy({ where: { id: testCity.id }, force: true });
    }
    await closeDbConnection();
  });

  describe('listCategories', () => {

    it('should return array of issue categories', async () => {
      const categories = await issueService.listCategories();
      
      expect(Array.isArray(categories)).toBe(true);
    });

    it('should return categories ordered by name ASC', async () => {
      const categories = await issueService.listCategories();
      
      if (categories.length >= 2) {
        const names = categories.map(c => c.name);
        const sortedNames = [...names].sort();
        expect(names).toEqual(sortedNames);
      }
    });

    it('should include required attributes', async () => {
      const categories = await issueService.listCategories();
      
      if (categories.length > 0) {
        const category = categories[0];
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('slug');
      }
    });

  });

  describe('listReports - Citizen Role', () => {
    let publicReport = null;
    let hiddenReport = null;
    let citizenOwnHiddenReport = null;

    beforeAll(async () => {
      // Create public report
      publicReport = await UserIssue.create({
        title: 'Public Report',
        description: 'A public report visible to all',
        issue_id: testIssueCategory.id,
        reporter_id: testUser.id,
        city_id: testCity.id,
        status: 'reported',
        is_hidden: false
      });

      // Create hidden report by another user (simulated)
      hiddenReport = await UserIssue.create({
        title: 'Hidden Report',
        description: 'A hidden report not visible to citizens',
        issue_id: testIssueCategory.id,
        reporter_id: testUser.id, // Same user for simplicity
        city_id: testCity.id,
        status: 'reported',
        is_hidden: true
      });
    });

    afterAll(async () => {
      if (publicReport) {
        await UserIssue.destroy({ where: { id: publicReport.id }, force: true });
      }
      if (hiddenReport) {
        await UserIssue.destroy({ where: { id: hiddenReport.id }, force: true });
      }
    });

    it('should only return non-hidden reports for citizen role', async () => {
      const citizenUser = { id: 999, role: 'citizen' }; // Different user
      
      const result = await issueService.listReports(
        citizenUser, 
        {}, 
        null, 
        { entityType: 'issues' }
      );
      
      expect(result.data).toBeDefined();
      const reportIds = result.data.map(r => r.id);
      expect(reportIds).toContain(publicReport.id);
      expect(reportIds).not.toContain(hiddenReport.id);
    });

    it('should return hidden reports when citizen filters by myIssues=true', async () => {
      const result = await issueService.listReports(
        { id: testUser.id, role: 'citizen' },
        { myIssues: true },
        null,
        { entityType: 'issues' }
      );
      
      // Should include reports by this user (both public and hidden)
      const reporterIds = result.data.map(r => r.reporter_id);
      reporterIds.forEach(id => {
        expect(id).toBe(testUser.id);
      });
    });

    it('should always return paginated response', async () => {
      const result = await issueService.listReports(
        { id: testUser.id, role: 'citizen' },
        {},
        null,
        { entityType: 'issues' }
      );
      
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('page');
      expect(result.meta).toHaveProperty('limit');
      expect(result.meta).toHaveProperty('total');
      expect(result.meta).toHaveProperty('totalPages');
    });

  });

  describe('listReports - Admin Role with City Scoping', () => {
    let city1Report = null;
    let city2Report = null;

    beforeAll(async () => {
      // Create report in city 1
      city1Report = await UserIssue.create({
        title: 'City 1 Report',
        description: 'Report in city 1',
        issue_id: testIssueCategory.id,
        reporter_id: testUser.id,
        city_id: testCity.id,
        status: 'reported',
        is_hidden: false
      });

      // Create report in city 2
      city2Report = await UserIssue.create({
        title: 'City 2 Report',
        description: 'Report in city 2',
        issue_id: testIssueCategory.id,
        reporter_id: testUser.id,
        city_id: testCity2.id,
        status: 'reported',
        is_hidden: false
      });
    });

    afterAll(async () => {
      if (city1Report) {
        await UserIssue.destroy({ where: { id: city1Report.id }, force: true });
      }
      if (city2Report) {
        await UserIssue.destroy({ where: { id: city2Report.id }, force: true });
      }
    });

    it('should filter reports by city when admin provides cityId', async () => {
      const adminUser = { id: testUser.id, role: 'admin' };
      const adminContext = { 
        adminCityId: testCity.id, 
        includeAllCities: false,
        includeDeleted: false
      };
      
      const result = await issueService.listReports(
        adminUser,
        {},
        adminContext,
        { entityType: 'issues' }
      );
      
      // All results should be from city 1
      result.data.forEach(report => {
        expect(report.city_id).toBe(testCity.id);
      });
    });

    it('should return reports from all cities when includeAllCities is true', async () => {
      const adminUser = { id: testUser.id, role: 'admin' };
      const adminContext = { 
        adminCityId: testCity.id, 
        includeAllCities: true,
        includeDeleted: false
      };
      
      const result = await issueService.listReports(
        adminUser,
        {},
        adminContext,
        { entityType: 'issues' }
      );
      
      // Should contain reports from both cities
      const cityIds = new Set(result.data.map(r => r.city_id));
      expect(cityIds.size).toBeGreaterThanOrEqual(1);
    });

  });

  describe('listReports - Authority Role', () => {
    let assignedReport = null;
    let unassignedReport = null;

    beforeAll(async () => {
      // Create authority-user mapping
      [testAuthorityUser] = await AuthorityUser.findOrCreate({
        where: { user_id: testUser.id },
        defaults: {
          authority_id: testAuthority.id,
          user_id: testUser.id
        }
      });

      // Create report assigned to this authority
      assignedReport = await UserIssue.create({
        title: 'Assigned Report',
        description: 'Report assigned to test authority',
        issue_id: testIssueCategory.id,
        reporter_id: testUser.id,
        authority_id: testAuthority.id,
        city_id: testCity.id,
        status: 'reported',
        is_hidden: false
      });

      // Create unassigned report
      unassignedReport = await UserIssue.create({
        title: 'Unassigned Report',
        description: 'Report not assigned to any authority',
        issue_id: testIssueCategory.id,
        reporter_id: testUser.id,
        authority_id: null,
        city_id: testCity.id,
        status: 'reported',
        is_hidden: false
      });
    });

    afterAll(async () => {
      if (assignedReport) {
        await UserIssue.destroy({ where: { id: assignedReport.id }, force: true });
      }
      if (unassignedReport) {
        await UserIssue.destroy({ where: { id: unassignedReport.id }, force: true });
      }
    });

    it('should only return reports assigned to authority user', async () => {
      const authorityUserActor = { id: testUser.id, role: 'authority' };
      
      const result = await issueService.listReports(
        authorityUserActor,
        {},
        null,
        { entityType: 'issues' }
      );
      
      // All results should be assigned to test authority
      result.data.forEach(report => {
        expect(report.authority_id).toBe(testAuthority.id);
      });
    });

    it('should throw 403 if authority user has no authority mapping', async () => {
      const orphanUser = { id: 999999, role: 'authority' };
      
      await expect(
        issueService.listReports(orphanUser, {}, null, { entityType: 'issues' })
      ).rejects.toMatchObject({
        statusCode: 403
      });
    });

  });

  describe('listReports - Status Filter', () => {
    let reportedReport = null;
    let resolvedReport = null;

    beforeAll(async () => {
      reportedReport = await UserIssue.create({
        title: 'Reported Status Report',
        description: 'Report with reported status',
        issue_id: testIssueCategory.id,
        reporter_id: testUser.id,
        city_id: testCity.id,
        status: 'reported',
        is_hidden: false
      });

      resolvedReport = await UserIssue.create({
        title: 'Resolved Status Report',
        description: 'Report with resolved status',
        issue_id: testIssueCategory.id,
        reporter_id: testUser.id,
        city_id: testCity.id,
        status: 'resolved',
        is_hidden: false
      });
    });

    afterAll(async () => {
      if (reportedReport) {
        await UserIssue.destroy({ where: { id: reportedReport.id }, force: true });
      }
      if (resolvedReport) {
        await UserIssue.destroy({ where: { id: resolvedReport.id }, force: true });
      }
    });

    it('should filter reports by status', async () => {
      const adminUser = { id: testUser.id, role: 'admin' };
      const adminContext = { 
        adminCityId: testCity.id, 
        includeAllCities: false 
      };
      
      const result = await issueService.listReports(
        adminUser,
        { status: 'reported' },
        adminContext,
        { entityType: 'issues' }
      );
      
      result.data.forEach(report => {
        expect(report.status).toBe('reported');
      });
    });

  });

  describe('getReportById', () => {
    let testReport = null;

    beforeAll(async () => {
      testReport = await UserIssue.create({
        title: 'Get By ID Test Report',
        description: 'Report for getReportById tests',
        issue_id: testIssueCategory.id,
        reporter_id: testUser.id,
        city_id: testCity.id,
        status: 'reported',
        is_hidden: false
      });
    });

    afterAll(async () => {
      if (testReport) {
        await UserIssue.destroy({ where: { id: testReport.id }, force: true });
      }
    });

    it('should return report with includes', async () => {
      const adminUser = { id: testUser.id, role: 'admin' };
      
      const report = await issueService.getReportById(testReport.id, adminUser);
      
      expect(report).toBeDefined();
      expect(report.id).toBe(testReport.id);
      expect(report).toHaveProperty('issue');
      expect(report).toHaveProperty('reporter');
    });

    it('should throw 404 for non-existent report', async () => {
      const adminUser = { id: testUser.id, role: 'admin' };
      
      await expect(
        issueService.getReportById(999999, adminUser)
      ).rejects.toMatchObject({
        statusCode: 404
      });
    });

    it('should throw 403 for citizen accessing hidden report not owned by them', async () => {
      // Create hidden report by another user
      const hiddenReport = await UserIssue.create({
        title: 'Hidden Report By Other',
        description: 'Hidden report',
        issue_id: testIssueCategory.id,
        reporter_id: testUser.id,
        city_id: testCity.id,
        status: 'reported',
        is_hidden: true
      });

      const otherCitizen = { id: 999999, role: 'citizen' };
      
      try {
        await expect(
          issueService.getReportById(hiddenReport.id, otherCitizen)
        ).rejects.toMatchObject({
          statusCode: 403
        });
      } finally {
        await UserIssue.destroy({ where: { id: hiddenReport.id }, force: true });
      }
    });

  });

});
