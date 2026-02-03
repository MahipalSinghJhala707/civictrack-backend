'use strict';

/**
 * Assignment Service Tests
 * 
 * Tests the authority assignment service invariants:
 * - All assignment outcomes are explicit and deterministic
 * - Soft-deleted authorities MUST NOT be considered for assignment
 * - Region matching takes priority over city-only matching
 * - Admin reassignment validates target authority is active
 * - Cross-city reassignment is not allowed
 */

process.env.NODE_ENV = 'test';

const { Op } = require('sequelize');
const { 
  sequelize, 
  Authority, 
  AuthorityIssue, 
  Issue,
  UserIssue, 
  User,
  City,
  Log 
} = require('../../src/models');
const {
  assignAuthority,
  ASSIGNMENT_OUTCOMES,
  TRIGGER_TYPES
} = require('../../src/modules/issue/assignment.service.js');
const { 
  ensureDbConnection, 
  closeDbConnection,
  createTestAuthorityData,
  createTestReportData
} = require('../setup/testHelpers.js');

describe('Assignment Service', () => {
  let testCity = null;
  let testIssueCategory = null;
  let testUser = null;

  beforeAll(async () => {
    await ensureDbConnection();

    // Create or find test city
    [testCity] = await City.findOrCreate({
      where: { name: 'Assignment Test City' },
      defaults: { name: 'Assignment Test City', state: 'Test State' }
    });

    // Create or find test issue category
    [testIssueCategory] = await Issue.findOrCreate({
      where: { name: 'Assignment Test Category' },
      defaults: { 
        name: 'Assignment Test Category', 
        slug: 'assignment-test-category',
        description: 'Test category for assignment tests'
      }
    });

    // Create test user
    [testUser] = await User.findOrCreate({
      where: { email: 'assignment-test-user@example.com' },
      defaults: {
        name: 'Assignment Test User',
        email: 'assignment-test-user@example.com',
        password_hash: 'test-hash'
      }
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUser) {
      await User.destroy({ where: { id: testUser.id }, force: true });
    }
    if (testIssueCategory) {
      await Issue.destroy({ where: { id: testIssueCategory.id }, force: true });
    }
    if (testCity) {
      await City.destroy({ where: { id: testCity.id }, force: true });
    }
    await closeDbConnection();
  });

  describe('ASSIGNMENT_OUTCOMES', () => {

    it('should define all required outcome constants', () => {
      expect(ASSIGNMENT_OUTCOMES.ASSIGNED).toBe('ASSIGNED');
      expect(ASSIGNMENT_OUTCOMES.UNASSIGNED_NO_MATCHING_AUTHORITY).toBe('UNASSIGNED_NO_MATCHING_AUTHORITY');
      expect(ASSIGNMENT_OUTCOMES.UNASSIGNED_AUTHORITY_INACTIVE).toBe('UNASSIGNED_AUTHORITY_INACTIVE');
      expect(ASSIGNMENT_OUTCOMES.UNASSIGNED_CONFIGURATION_ERROR).toBe('UNASSIGNED_CONFIGURATION_ERROR');
      expect(ASSIGNMENT_OUTCOMES.REASSIGNED_BY_ADMIN).toBe('REASSIGNED_BY_ADMIN');
    });

  });

  describe('TRIGGER_TYPES', () => {

    it('should define all required trigger types', () => {
      expect(TRIGGER_TYPES.SYSTEM).toBe('system');
      expect(TRIGGER_TYPES.ADMIN).toBe('admin');
      expect(TRIGGER_TYPES.RETRY).toBe('retry');
    });

  });

  describe('assignAuthority - Parameter Validation', () => {

    it('should throw error when reportId is not provided', async () => {
      await expect(
        assignAuthority({
          issueCategoryId: 1,
          cityId: 1,
          triggeredBy: TRIGGER_TYPES.SYSTEM
        })
      ).rejects.toMatchObject({
        message: expect.stringContaining('reportId is required'),
        statusCode: 400
      });
    });

    it('should throw error when issueCategoryId is not provided', async () => {
      await expect(
        assignAuthority({
          reportId: 1,
          cityId: 1,
          triggeredBy: TRIGGER_TYPES.SYSTEM
        })
      ).rejects.toMatchObject({
        message: expect.stringContaining('issueCategoryId is required'),
        statusCode: 400
      });
    });

    it('should throw error when cityId is not provided', async () => {
      await expect(
        assignAuthority({
          reportId: 1,
          issueCategoryId: 1,
          triggeredBy: TRIGGER_TYPES.SYSTEM
        })
      ).rejects.toMatchObject({
        message: expect.stringContaining('cityId is required'),
        statusCode: 400
      });
    });

    it('should throw error when triggeredBy is invalid', async () => {
      await expect(
        assignAuthority({
          reportId: 1,
          issueCategoryId: 1,
          cityId: 1,
          triggeredBy: 'invalid'
        })
      ).rejects.toMatchObject({
        message: expect.stringContaining('triggeredBy must be one of'),
        statusCode: 400
      });
    });

    it('should throw error when admin trigger lacks adminUserId', async () => {
      await expect(
        assignAuthority({
          reportId: 1,
          issueCategoryId: 1,
          cityId: 1,
          triggeredBy: TRIGGER_TYPES.ADMIN
        })
      ).rejects.toMatchObject({
        message: expect.stringContaining('adminUserId is required'),
        statusCode: 400
      });
    });

  });

  describe('assignAuthority - No Matching Authority', () => {
    let testReport = null;
    let transaction = null;

    beforeEach(async () => {
      transaction = await sequelize.transaction();
      
      // Create a report without any matching authority configuration
      testReport = await UserIssue.create({
        title: 'No Authority Test Report',
        description: 'Test report for no matching authority scenario',
        issue_id: testIssueCategory.id,
        reporter_id: testUser.id,
        city_id: testCity.id,
        status: 'reported'
      }, { transaction });
    });

    afterEach(async () => {
      if (transaction) {
        await transaction.rollback();
      }
    });

    it('should return UNASSIGNED_NO_MATCHING_AUTHORITY when no authority handles the issue category', async () => {
      // Ensure no authority-issue mapping exists for this category
      await AuthorityIssue.destroy({ 
        where: { issue_id: testIssueCategory.id },
        transaction,
        force: true
      });

      const result = await assignAuthority({
        reportId: testReport.id,
        issueCategoryId: testIssueCategory.id,
        cityId: testCity.id,
        triggeredBy: TRIGGER_TYPES.SYSTEM,
        systemUserId: testUser.id,
        transaction
      });

      expect(result.outcome).toBe(ASSIGNMENT_OUTCOMES.UNASSIGNED_NO_MATCHING_AUTHORITY);
      expect(result.authorityId).toBeNull();
      expect(result.reason).toContain('No authorities are configured');
    });

  });

  describe('assignAuthority - Successful Assignment', () => {
    let testAuthority = null;
    let testAuthorityIssue = null;
    let testReport = null;

    beforeEach(async () => {
      // Create test authority (committed, not in transaction)
      // findMatchingAuthority doesn't use transaction, so data must be committed
      testAuthority = await Authority.create({
        name: 'Test Authority for Assignment',
        city: 'Assignment Test City',
        region: 'Test Region',
        city_id: testCity.id
      });

      // Create authority-issue mapping (committed)
      testAuthorityIssue = await AuthorityIssue.create({
        authority_id: testAuthority.id,
        issue_id: testIssueCategory.id
      });

      // Create test report (committed)
      testReport = await UserIssue.create({
        title: 'Assignment Test Report',
        description: 'Test report for successful assignment',
        issue_id: testIssueCategory.id,
        reporter_id: testUser.id,
        city_id: testCity.id,
        region: 'Test Region',
        status: 'reported'
      });
    });

    afterEach(async () => {
      // Clean up committed data
      if (testReport) await UserIssue.destroy({ where: { id: testReport.id }, force: true });
      if (testAuthorityIssue) await AuthorityIssue.destroy({ where: { id: testAuthorityIssue.id }, force: true });
      if (testAuthority) await Authority.destroy({ where: { id: testAuthority.id }, force: true });
    });

    it('should return ASSIGNED when matching authority exists', async () => {
      const result = await assignAuthority({
        reportId: testReport.id,
        issueCategoryId: testIssueCategory.id,
        cityId: testCity.id,
        region: 'Test Region',
        triggeredBy: TRIGGER_TYPES.SYSTEM,
        systemUserId: testUser.id
      });

      expect(result.outcome).toBe(ASSIGNMENT_OUTCOMES.ASSIGNED);
      expect(result.authorityId).toBe(String(testAuthority.id));
    });

    it('should update report authority_id on successful assignment', async () => {
      await assignAuthority({
        reportId: testReport.id,
        issueCategoryId: testIssueCategory.id,
        cityId: testCity.id,
        triggeredBy: TRIGGER_TYPES.SYSTEM,
        systemUserId: testUser.id
      });

      const updatedReport = await UserIssue.findByPk(testReport.id);
      expect(String(updatedReport.authority_id)).toBe(String(testAuthority.id));
    });

  });

  describe('assignAuthority - Soft-Delete Exclusion', () => {
    let activeAuthority = null;
    let deletedAuthority = null;
    let deletedAuthorityIssue = null;
    let activeAuthorityIssue = null;
    let testReport = null;

    beforeEach(async () => {
      // Create a soft-deleted authority (committed, not in transaction)
      deletedAuthority = await Authority.create({
        name: 'Deleted Authority',
        city: 'Assignment Test City',
        region: 'Test Region',
        city_id: testCity.id
      });

      deletedAuthorityIssue = await AuthorityIssue.create({
        authority_id: deletedAuthority.id,
        issue_id: testIssueCategory.id
      });

      // Soft-delete the authority
      await deletedAuthority.destroy();

      // Create test report
      testReport = await UserIssue.create({
        title: 'Soft Delete Test Report',
        description: 'Test report for soft-delete exclusion',
        issue_id: testIssueCategory.id,
        reporter_id: testUser.id,
        city_id: testCity.id,
        region: 'Test Region',
        status: 'reported'
      });
    });

    afterEach(async () => {
      // Clean up committed data
      if (testReport) await UserIssue.destroy({ where: { id: testReport.id }, force: true });
      if (activeAuthorityIssue) await AuthorityIssue.destroy({ where: { id: activeAuthorityIssue.id }, force: true });
      if (deletedAuthorityIssue) await AuthorityIssue.destroy({ where: { id: deletedAuthorityIssue.id }, force: true });
      if (activeAuthority) await Authority.destroy({ where: { id: activeAuthority.id }, force: true });
      if (deletedAuthority) await Authority.destroy({ where: { id: deletedAuthority.id }, force: true });
    });

    it('should return UNASSIGNED_AUTHORITY_INACTIVE when only soft-deleted authorities exist', async () => {
      const result = await assignAuthority({
        reportId: testReport.id,
        issueCategoryId: testIssueCategory.id,
        cityId: testCity.id,
        region: 'Test Region',
        triggeredBy: TRIGGER_TYPES.SYSTEM,
        systemUserId: testUser.id
      });

      expect(result.outcome).toBe(ASSIGNMENT_OUTCOMES.UNASSIGNED_AUTHORITY_INACTIVE);
      expect(result.authorityId).toBeNull();
      expect(result.reason).toContain('inactive');
    });

    it('should assign to active authority when both active and deleted exist', async () => {
      // Create an active authority
      activeAuthority = await Authority.create({
        name: 'Active Authority',
        city: 'Assignment Test City',
        region: 'Test Region',
        city_id: testCity.id
      });

      activeAuthorityIssue = await AuthorityIssue.create({
        authority_id: activeAuthority.id,
        issue_id: testIssueCategory.id
      });

      const result = await assignAuthority({
        reportId: testReport.id,
        issueCategoryId: testIssueCategory.id,
        cityId: testCity.id,
        region: 'Test Region',
        triggeredBy: TRIGGER_TYPES.SYSTEM,
        systemUserId: testUser.id
      });

      expect(result.outcome).toBe(ASSIGNMENT_OUTCOMES.ASSIGNED);
      expect(String(result.authorityId)).toBe(String(activeAuthority.id));
    });

  });

  describe('assignAuthority - Admin Reassignment', () => {
    let testAuthority = null;
    let testReport = null;
    let otherCity = null;
    let otherCityAuthority = null;

    beforeEach(async () => {
      // Create test authority (committed)
      testAuthority = await Authority.create({
        name: 'Admin Reassign Authority',
        city: 'Assignment Test City',
        region: 'Test Region',
        city_id: testCity.id
      });

      // Create test report
      testReport = await UserIssue.create({
        title: 'Admin Reassign Test Report',
        description: 'Test report for admin reassignment',
        issue_id: testIssueCategory.id,
        reporter_id: testUser.id,
        city_id: testCity.id,
        status: 'reported'
      });
    });

    afterEach(async () => {
      // Clean up committed data
      if (testReport) await UserIssue.destroy({ where: { id: testReport.id }, force: true });
      if (otherCityAuthority) await Authority.destroy({ where: { id: otherCityAuthority.id }, force: true });
      if (testAuthority) await Authority.destroy({ where: { id: testAuthority.id }, force: true });
      if (otherCity) await City.destroy({ where: { id: otherCity.id }, force: true });
    });

    it('should return REASSIGNED_BY_ADMIN for admin reassignment', async () => {
      const result = await assignAuthority({
        reportId: testReport.id,
        issueCategoryId: testIssueCategory.id,
        cityId: testCity.id,
        triggeredBy: TRIGGER_TYPES.ADMIN,
        adminUserId: testUser.id,
        targetAuthorityId: testAuthority.id
      });

      expect(result.outcome).toBe(ASSIGNMENT_OUTCOMES.REASSIGNED_BY_ADMIN);
      expect(String(result.authorityId)).toBe(String(testAuthority.id));
    });

    it('should allow admin to explicitly unassign (targetAuthorityId: null)', async () => {
      // First assign
      testReport.authority_id = testAuthority.id;
      await testReport.save();

      const result = await assignAuthority({
        reportId: testReport.id,
        issueCategoryId: testIssueCategory.id,
        cityId: testCity.id,
        triggeredBy: TRIGGER_TYPES.ADMIN,
        adminUserId: testUser.id,
        targetAuthorityId: null
      });

      expect(result.outcome).toBe(ASSIGNMENT_OUTCOMES.REASSIGNED_BY_ADMIN);
      expect(result.authorityId).toBeNull();
    });

    it('should reject reassignment to soft-deleted authority', async () => {
      // Soft-delete the authority
      await testAuthority.destroy();

      await expect(
        assignAuthority({
          reportId: testReport.id,
          issueCategoryId: testIssueCategory.id,
          cityId: testCity.id,
          triggeredBy: TRIGGER_TYPES.ADMIN,
          adminUserId: testUser.id,
          targetAuthorityId: testAuthority.id
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('no longer active')
      });
    });

    it('should reject cross-city reassignment', async () => {
      // Create authority in different city
      [otherCity] = await City.findOrCreate({
        where: { name: 'Other City for Admin Test' },
        defaults: { name: 'Other City for Admin Test', state: 'Other State' }
      });

      otherCityAuthority = await Authority.create({
        name: 'Other City Authority',
        city: 'Other City',
        region: 'Other Region',
        city_id: otherCity.id
      });

      await expect(
        assignAuthority({
          reportId: testReport.id,
          issueCategoryId: testIssueCategory.id,
          cityId: testCity.id,
          triggeredBy: TRIGGER_TYPES.ADMIN,
          adminUserId: testUser.id,
          targetAuthorityId: otherCityAuthority.id
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('different city')
      });
    });

  });

});
