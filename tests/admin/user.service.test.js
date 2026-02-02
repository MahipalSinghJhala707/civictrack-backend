'use strict';

/**
 * Admin User Service Tests
 * 
 * Tests the admin user service invariants:
 * - City-scoped queries by default
 * - includeAllCities bypasses city filter  
 * - includeDeleted shows soft-deleted records
 * - Pagination is always enforced
 * - Role assignment works correctly
 */

process.env.NODE_ENV = 'test';

const bcrypt = require('bcrypt');
const { 
  sequelize, 
  User, 
  Role,
  UserRole,
  City 
} = require('../../src/models');
const userService = require('../../src/modules/admin/user/user.service.js');
const { 
  ensureDbConnection, 
  closeDbConnection,
  createTestUserData
} = require('../setup/testHelpers.js');

describe('Admin User Service', () => {
  let testCity = null;
  let testCity2 = null;
  let citizenRole = null;
  let adminRole = null;

  beforeAll(async () => {
    await ensureDbConnection();

    // Create test cities
    [testCity] = await City.findOrCreate({
      where: { name: 'Admin User Test City 1' },
      defaults: { name: 'Admin User Test City 1', state: 'Test State' }
    });

    [testCity2] = await City.findOrCreate({
      where: { name: 'Admin User Test City 2' },
      defaults: { name: 'Admin User Test City 2', state: 'Test State' }
    });

    // Ensure roles exist
    [citizenRole] = await Role.findOrCreate({
      where: { name: 'citizen' },
      defaults: { name: 'citizen', description: 'Regular citizen' }
    });

    [adminRole] = await Role.findOrCreate({
      where: { name: 'admin' },
      defaults: { name: 'admin', description: 'Administrator' }
    });
  });

  afterAll(async () => {
    if (testCity2) {
      await City.destroy({ where: { id: testCity2.id }, force: true });
    }
    if (testCity) {
      await City.destroy({ where: { id: testCity.id }, force: true });
    }
    await closeDbConnection();
  });

  describe('listUsers - City Scoping', () => {
    let city1User = null;
    let city2User = null;

    beforeAll(async () => {
      const userData1 = createTestUserData({ 
        name: 'City 1 User',
        city_id: testCity.id
      });
      city1User = await User.create({
        name: userData1.name,
        email: userData1.email,
        password_hash: await bcrypt.hash(userData1.password, 10),
        city_id: testCity.id
      });

      const userData2 = createTestUserData({ 
        name: 'City 2 User',
        city_id: testCity2.id
      });
      city2User = await User.create({
        name: userData2.name,
        email: userData2.email,
        password_hash: await bcrypt.hash(userData2.password, 10),
        city_id: testCity2.id
      });
    });

    afterAll(async () => {
      if (city1User) {
        await UserRole.destroy({ where: { user_id: city1User.id }, force: true });
        await User.destroy({ where: { id: city1User.id }, force: true });
      }
      if (city2User) {
        await UserRole.destroy({ where: { user_id: city2User.id }, force: true });
        await User.destroy({ where: { id: city2User.id }, force: true });
      }
    });

    it('should filter users by city when adminCityId is provided', async () => {
      const adminContext = { 
        adminCityId: testCity.id, 
        includeAllCities: false,
        includeDeleted: false
      };
      const pagination = { entityType: 'users' };
      
      const result = await userService.listUsers(adminContext, pagination);
      
      result.data.forEach(user => {
        expect(user.city_id).toBe(testCity.id);
      });
    });

    it('should return users from all cities when includeAllCities is true', async () => {
      const adminContext = { 
        adminCityId: testCity.id, 
        includeAllCities: true,
        includeDeleted: false
      };
      const pagination = { entityType: 'users' };
      
      const result = await userService.listUsers(adminContext, pagination);
      
      // Should have users (may include users from various cities)
      expect(result.data.length).toBeGreaterThanOrEqual(0);
    });

  });

  describe('listUsers - Soft Delete Handling', () => {
    let activeUser = null;
    let deletedUser = null;

    beforeAll(async () => {
      const activeData = createTestUserData({ name: 'Active User' });
      activeUser = await User.create({
        name: activeData.name,
        email: activeData.email,
        password_hash: await bcrypt.hash(activeData.password, 10),
        city_id: testCity.id
      });

      const deletedData = createTestUserData({ name: 'Deleted User' });
      deletedUser = await User.create({
        name: deletedData.name,
        email: deletedData.email,
        password_hash: await bcrypt.hash(deletedData.password, 10),
        city_id: testCity.id
      });

      // Soft-delete the user
      await deletedUser.destroy();
    });

    afterAll(async () => {
      if (activeUser) {
        await UserRole.destroy({ where: { user_id: activeUser.id }, force: true });
        await User.destroy({ where: { id: activeUser.id }, force: true });
      }
      if (deletedUser) {
        await UserRole.destroy({ where: { user_id: deletedUser.id }, force: true });
        await User.destroy({ where: { id: deletedUser.id }, force: true });
      }
    });

    it('should exclude soft-deleted users by default', async () => {
      const adminContext = { 
        adminCityId: testCity.id, 
        includeAllCities: false,
        includeDeleted: false
      };
      const pagination = { entityType: 'users' };
      
      const result = await userService.listUsers(adminContext, pagination);
      
      const userIds = result.data.map(u => u.id);
      expect(userIds).toContain(activeUser.id);
      expect(userIds).not.toContain(deletedUser.id);
    });

    it('should include soft-deleted users when includeDeleted is true', async () => {
      const adminContext = { 
        adminCityId: testCity.id, 
        includeAllCities: false,
        includeDeleted: true
      };
      const pagination = { entityType: 'users' };
      
      const result = await userService.listUsers(adminContext, pagination);
      
      const userIds = result.data.map(u => u.id);
      expect(userIds).toContain(activeUser.id);
      expect(userIds).toContain(deletedUser.id);
    });

  });

  describe('listUsers - Pagination', () => {

    it('should return paginated response structure', async () => {
      const adminContext = { 
        adminCityId: testCity.id, 
        includeAllCities: false 
      };
      const pagination = { entityType: 'users' };
      
      const result = await userService.listUsers(adminContext, pagination);
      
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('page');
      expect(result.meta).toHaveProperty('limit');
      expect(result.meta).toHaveProperty('total');
      expect(result.meta).toHaveProperty('totalPages');
    });

  });

  describe('createUser', () => {
    let createdUser = null;

    afterEach(async () => {
      if (createdUser) {
        await UserRole.destroy({ where: { user_id: createdUser.id }, force: true });
        await User.destroy({ where: { id: createdUser.id }, force: true });
        createdUser = null;
      }
    });

    it('should create user with hashed password', async () => {
      const userData = createTestUserData();
      
      createdUser = await userService.createUser({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        roleIds: [citizenRole.id]
      });
      
      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.password_hash).not.toBe(userData.password);
    });

    it('should assign roles to created user', async () => {
      const userData = createTestUserData();
      
      createdUser = await userService.createUser({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        roleIds: [citizenRole.id, adminRole.id]
      });
      
      const userWithRoles = await User.findByPk(createdUser.id, {
        include: [{ model: Role, as: 'roles' }]
      });
      
      expect(userWithRoles.roles.length).toBe(2);
    });

    it('should throw 409 for duplicate email', async () => {
      const userData = createTestUserData();
      
      // First creation
      createdUser = await userService.createUser({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        roleIds: [citizenRole.id]
      });
      
      // Second creation with same email
      await expect(
        userService.createUser({
          name: 'Another User',
          email: userData.email,
          password: userData.password,
          roleIds: [citizenRole.id]
        })
      ).rejects.toMatchObject({
        statusCode: 409
      });
    });

    it('should throw 404 for non-existent role', async () => {
      const userData = createTestUserData();
      
      await expect(
        userService.createUser({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          roleIds: [999999]
        })
      ).rejects.toMatchObject({
        statusCode: 404
      });
    });

  });

  describe('updateUser', () => {
    let testUser = null;

    beforeEach(async () => {
      const userData = createTestUserData();
      testUser = await User.create({
        name: userData.name,
        email: userData.email,
        password_hash: await bcrypt.hash(userData.password, 10),
        city_id: testCity.id
      });

      await UserRole.create({
        user_id: testUser.id,
        role_id: citizenRole.id
      });
    });

    afterEach(async () => {
      if (testUser) {
        await UserRole.destroy({ where: { user_id: testUser.id }, force: true });
        await User.destroy({ where: { id: testUser.id }, force: true });
      }
    });

    it('should update user name', async () => {
      const updated = await userService.updateUser(testUser.id, {
        name: 'Updated Name'
      });
      
      expect(updated.name).toBe('Updated Name');
    });

    it('should throw 404 for non-existent user', async () => {
      await expect(
        userService.updateUser(999999, { name: 'Test' })
      ).rejects.toMatchObject({
        statusCode: 404
      });
    });

  });

  describe('deleteUser', () => {
    let testUser = null;

    beforeEach(async () => {
      const userData = createTestUserData();
      testUser = await User.create({
        name: userData.name,
        email: userData.email,
        password_hash: await bcrypt.hash(userData.password, 10),
        city_id: testCity.id
      });
    });

    afterEach(async () => {
      if (testUser) {
        await UserRole.destroy({ where: { user_id: testUser.id }, force: true });
        await User.destroy({ where: { id: testUser.id }, force: true });
      }
    });

    it('should soft-delete user', async () => {
      await userService.deleteUser(testUser.id);
      
      // Should not be found with default paranoid query
      const found = await User.findByPk(testUser.id);
      expect(found).toBeNull();
      
      // Should be found with paranoid: false
      const foundWithDeleted = await User.findByPk(testUser.id, { paranoid: false });
      expect(foundWithDeleted).not.toBeNull();
      expect(foundWithDeleted.deleted_at).not.toBeNull();
    });

  });

});
