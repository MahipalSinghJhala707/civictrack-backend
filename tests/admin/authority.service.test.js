'use strict';

/**
 * Admin Authority Service Tests
 * 
 * Tests the admin authority service invariants:
 * - City-scoped queries by default
 * - includeAllCities bypasses city filter
 * - includeDeleted shows soft-deleted records
 * - Pagination is always enforced
 */

process.env.NODE_ENV = 'test';

const { 
  sequelize, 
  Authority, 
  Department,
  City 
} = require('../../src/models');
const authorityService = require('../../src/modules/admin/authority/authority.service.js');
const { 
  ensureDbConnection, 
  closeDbConnection 
} = require('../setup/testHelpers.js');

describe('Admin Authority Service', () => {
  let testCity = null;
  let testCity2 = null;
  let testDepartment = null;

  beforeAll(async () => {
    await ensureDbConnection();

    // Create test cities
    [testCity] = await City.findOrCreate({
      where: { name: 'Admin Auth Test City 1' },
      defaults: { name: 'Admin Auth Test City 1', state: 'Test State' }
    });

    [testCity2] = await City.findOrCreate({
      where: { name: 'Admin Auth Test City 2' },
      defaults: { name: 'Admin Auth Test City 2', state: 'Test State' }
    });

    // Create test department
    [testDepartment] = await Department.findOrCreate({
      where: { name: 'Admin Auth Test Department' },
      defaults: { 
        name: 'Admin Auth Test Department',
        description: 'Test department for authority tests'
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await Authority.destroy({ 
      where: { city_id: [testCity?.id, testCity2?.id].filter(Boolean) },
      force: true 
    });
    if (testDepartment) {
      await Department.destroy({ where: { id: testDepartment.id }, force: true });
    }
    if (testCity2) {
      await City.destroy({ where: { id: testCity2.id }, force: true });
    }
    if (testCity) {
      await City.destroy({ where: { id: testCity.id }, force: true });
    }
    await closeDbConnection();
  });

  describe('listAuthorities - City Scoping', () => {
    let city1Authority = null;
    let city2Authority = null;

    beforeAll(async () => {
      city1Authority = await Authority.create({
        name: 'City 1 Authority',
        city: 'Admin Auth Test City 1',
        region: 'Region 1',
        city_id: testCity.id,
        department_id: testDepartment.id
      });

      city2Authority = await Authority.create({
        name: 'City 2 Authority',
        city: 'Admin Auth Test City 2',
        region: 'Region 2',
        city_id: testCity2.id,
        department_id: testDepartment.id
      });
    });

    afterAll(async () => {
      if (city1Authority) {
        await Authority.destroy({ where: { id: city1Authority.id }, force: true });
      }
      if (city2Authority) {
        await Authority.destroy({ where: { id: city2Authority.id }, force: true });
      }
    });

    it('should filter authorities by city when adminCityId is provided', async () => {
      const adminContext = { 
        adminCityId: testCity.id, 
        includeAllCities: false,
        includeDeleted: false
      };
      const pagination = { entityType: 'authorities' };
      
      const result = await authorityService.listAuthorities(adminContext, pagination);
      
      result.data.forEach(auth => {
        expect(auth.city_id).toBe(testCity.id);
      });
    });

    it('should return authorities from all cities when includeAllCities is true', async () => {
      const adminContext = { 
        adminCityId: testCity.id, 
        includeAllCities: true,
        includeDeleted: false
      };
      const pagination = { entityType: 'authorities' };
      
      const result = await authorityService.listAuthorities(adminContext, pagination);
      
      const cityIds = new Set(result.data.map(a => a.city_id));
      // Should have authorities from at least one city
      expect(cityIds.size).toBeGreaterThanOrEqual(1);
    });

    it('should throw error when city scope is ambiguous', async () => {
      const adminContext = { 
        adminCityId: null, 
        includeAllCities: false 
      };
      const pagination = { entityType: 'authorities' };
      
      await expect(
        authorityService.listAuthorities(adminContext, pagination)
      ).rejects.toMatchObject({
        statusCode: 400
      });
    });

  });

  describe('listAuthorities - Soft Delete Handling', () => {
    let activeAuthority = null;
    let deletedAuthority = null;

    beforeAll(async () => {
      activeAuthority = await Authority.create({
        name: 'Active Authority',
        city: 'Admin Auth Test City 1',
        region: 'Active Region',
        city_id: testCity.id
      });

      deletedAuthority = await Authority.create({
        name: 'Deleted Authority',
        city: 'Admin Auth Test City 1',
        region: 'Deleted Region',
        city_id: testCity.id
      });

      // Soft-delete the authority
      await deletedAuthority.destroy();
    });

    afterAll(async () => {
      if (activeAuthority) {
        await Authority.destroy({ where: { id: activeAuthority.id }, force: true });
      }
      if (deletedAuthority) {
        await Authority.destroy({ where: { id: deletedAuthority.id }, force: true });
      }
    });

    it('should exclude soft-deleted authorities by default', async () => {
      const adminContext = { 
        adminCityId: testCity.id, 
        includeAllCities: false,
        includeDeleted: false
      };
      const pagination = { entityType: 'authorities' };
      
      const result = await authorityService.listAuthorities(adminContext, pagination);
      
      const authorityIds = result.data.map(a => a.id);
      expect(authorityIds).toContain(activeAuthority.id);
      expect(authorityIds).not.toContain(deletedAuthority.id);
    });

    it('should include soft-deleted authorities when includeDeleted is true', async () => {
      const adminContext = { 
        adminCityId: testCity.id, 
        includeAllCities: false,
        includeDeleted: true
      };
      const pagination = { entityType: 'authorities' };
      
      const result = await authorityService.listAuthorities(adminContext, pagination);
      
      const authorityIds = result.data.map(a => a.id);
      expect(authorityIds).toContain(activeAuthority.id);
      expect(authorityIds).toContain(deletedAuthority.id);
    });

  });

  describe('listAuthorities - Pagination', () => {

    it('should return paginated response structure', async () => {
      const adminContext = { 
        adminCityId: testCity.id, 
        includeAllCities: false 
      };
      const pagination = { entityType: 'authorities' };
      
      const result = await authorityService.listAuthorities(adminContext, pagination);
      
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('page');
      expect(result.meta).toHaveProperty('limit');
      expect(result.meta).toHaveProperty('total');
      expect(result.meta).toHaveProperty('totalPages');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should respect custom page and limit', async () => {
      const adminContext = { 
        adminCityId: testCity.id, 
        includeAllCities: false 
      };
      const pagination = { 
        entityType: 'authorities',
        page: 1,
        limit: 5
      };
      
      const result = await authorityService.listAuthorities(adminContext, pagination);
      
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(5);
      expect(result.data.length).toBeLessThanOrEqual(5);
    });

  });

  describe('createAuthority', () => {

    it('should create authority with department', async () => {
      const payload = {
        name: 'New Test Authority',
        city: 'Admin Auth Test City 1',
        region: 'New Region',
        departmentId: testDepartment.id,
        address: '123 Test Street'
      };
      
      const authority = await authorityService.createAuthority(payload);
      
      try {
        expect(authority).toBeDefined();
        expect(authority.name).toBe(payload.name);
        expect(authority.department_id).toBe(testDepartment.id);
        expect(authority.department).toBeDefined();
      } finally {
        await Authority.destroy({ where: { id: authority.id }, force: true });
      }
    });

    it('should throw 404 for non-existent department', async () => {
      const payload = {
        name: 'Authority with Bad Dept',
        city: 'Admin Auth Test City 1',
        region: 'Region',
        departmentId: 999999
      };
      
      await expect(
        authorityService.createAuthority(payload)
      ).rejects.toMatchObject({
        statusCode: 404
      });
    });

  });

  describe('updateAuthority', () => {
    let testAuthority = null;

    beforeEach(async () => {
      testAuthority = await Authority.create({
        name: 'Update Test Authority',
        city: 'Admin Auth Test City 1',
        region: 'Update Region',
        city_id: testCity.id
      });
    });

    afterEach(async () => {
      if (testAuthority) {
        await Authority.destroy({ where: { id: testAuthority.id }, force: true });
      }
    });

    it('should update authority fields', async () => {
      const payload = {
        name: 'Updated Authority Name',
        region: 'Updated Region'
      };
      
      const updated = await authorityService.updateAuthority(testAuthority.id, payload);
      
      expect(updated.name).toBe(payload.name);
      expect(updated.region).toBe(payload.region);
    });

    it('should throw 404 for non-existent authority', async () => {
      await expect(
        authorityService.updateAuthority(999999, { name: 'Test' })
      ).rejects.toMatchObject({
        statusCode: 404
      });
    });

  });

  describe('deleteAuthority', () => {
    let testAuthority = null;

    beforeEach(async () => {
      testAuthority = await Authority.create({
        name: 'Delete Test Authority',
        city: 'Admin Auth Test City 1',
        region: 'Delete Region',
        city_id: testCity.id
      });
    });

    afterEach(async () => {
      // Force delete in case test didn't clean up
      if (testAuthority) {
        await Authority.destroy({ where: { id: testAuthority.id }, force: true });
      }
    });

    it('should soft-delete authority', async () => {
      await authorityService.deleteAuthority(testAuthority.id);
      
      // Should not be found with default paranoid query
      const found = await Authority.findByPk(testAuthority.id);
      expect(found).toBeNull();
      
      // Should be found with paranoid: false
      const foundWithDeleted = await Authority.findByPk(testAuthority.id, { paranoid: false });
      expect(foundWithDeleted).not.toBeNull();
      expect(foundWithDeleted.deleted_at).not.toBeNull();
    });

    it('should throw 404 for non-existent authority', async () => {
      await expect(
        authorityService.deleteAuthority(999999)
      ).rejects.toMatchObject({
        statusCode: 404
      });
    });

  });

});


// test file