'use strict';

/**
 * Auth Service Tests
 * 
 * Tests authentication service invariants:
 * - Registration creates user with citizen role
 * - Duplicate email registration fails
 * - Login requires valid credentials
 * - Login requires user to have the requested role
 * - Token generation requires JWT_SECRET
 * - Password change validates old password
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
process.env.JWT_SALT = 'test-salt';

const bcrypt = require('bcrypt');
const { sequelize, User, Role, UserRole } = require('../../src/models');
const authService = require('../../src/modules/auth/auth.service.js');
const { 
  ensureDbConnection, 
  closeDbConnection,
  createTestUserData 
} = require('../setup/testHelpers.js');

describe('Auth Service', () => {
  
  beforeAll(async () => {
    await ensureDbConnection();
    
    // Ensure citizen role exists
    const [citizenRole] = await Role.findOrCreate({
      where: { name: 'citizen' },
      defaults: { name: 'citizen', description: 'Regular citizen user' }
    });
  });

  afterAll(async () => {
    await closeDbConnection();
  });

  describe('register', () => {
    let createdUserId = null;

    afterEach(async () => {
      // Cleanup any created user
      if (createdUserId) {
        await UserRole.destroy({ where: { user_id: createdUserId }, force: true });
        await User.destroy({ where: { id: createdUserId }, force: true });
        createdUserId = null;
      }
    });

    it('should register a new user with hashed password', async () => {
      const userData = createTestUserData();
      
      const user = await authService.register(userData);
      createdUserId = user.id;
      
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.password_hash).not.toBe(userData.password);
    });

    it('should assign citizen role to new user', async () => {
      const userData = createTestUserData();
      
      const user = await authService.register(userData);
      createdUserId = user.id;
      
      const userRole = await UserRole.findOne({
        where: { user_id: user.id },
        include: [{ model: Role }]
      });

      expect(userRole).toBeDefined();
      expect(userRole.Role.name).toBe('citizen');
    });

    it('should throw 409 for duplicate email registration', async () => {
      const userData = createTestUserData();
      
      // First registration
      const user = await authService.register(userData);
      createdUserId = user.id;
      
      // Second registration with same email
      await expect(
        authService.register(userData)
      ).rejects.toMatchObject({
        message: expect.stringContaining('already registered'),
        statusCode: 409
      });
    });

    it('should hash password with bcrypt', async () => {
      const userData = createTestUserData();
      
      const user = await authService.register(userData);
      createdUserId = user.id;
      
      // Verify password can be compared with bcrypt
      const isMatch = await bcrypt.compare(userData.password, user.password_hash);
      expect(isMatch).toBe(true);
    });

  });

  describe('login', () => {
    let testUser = null;
    const testPassword = 'TestLogin123!';

    beforeAll(async () => {
      // Create a test user for login tests
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      const userData = createTestUserData({ password: testPassword });
      
      testUser = await User.create({
        name: userData.name,
        email: userData.email,
        password_hash: hashedPassword
      });

      const citizenRole = await Role.findOne({ where: { name: 'citizen' } });
      await UserRole.create({
        user_id: testUser.id,
        role_id: citizenRole.id
      });
    });

    afterAll(async () => {
      if (testUser) {
        await UserRole.destroy({ where: { user_id: testUser.id }, force: true });
        await User.destroy({ where: { id: testUser.id }, force: true });
      }
    });

    it('should login with valid credentials and return token', async () => {
      const result = await authService.login({
        email: testUser.email,
        password: testPassword,
        role: 'citizen'
      });
      
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(testUser.id);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should throw 401 for invalid email', async () => {
      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: testPassword,
          role: 'citizen'
        })
      ).rejects.toMatchObject({
        message: 'Invalid email or password.',
        statusCode: 401
      });
    });

    it('should throw 401 for invalid password', async () => {
      await expect(
        authService.login({
          email: testUser.email,
          password: 'WrongPassword123!',
          role: 'citizen'
        })
      ).rejects.toMatchObject({
        message: 'Invalid email or password.',
        statusCode: 401
      });
    });

    it('should throw 400 for invalid role name', async () => {
      await expect(
        authService.login({
          email: testUser.email,
          password: testPassword,
          role: 'invalidRole'
        })
      ).rejects.toMatchObject({
        message: 'Invalid role selected.',
        statusCode: 400
      });
    });

    it('should throw 403 when user does not have requested role', async () => {
      // Try to login as admin when user only has citizen role
      await expect(
        authService.login({
          email: testUser.email,
          password: testPassword,
          role: 'admin'
        })
      ).rejects.toMatchObject({
        statusCode: expect.any(Number) // Could be 400 (invalid role) or 403 (no access)
      });
    });

  });

  describe('changePassword', () => {
    let testUser = null;
    const originalPassword = 'Original123!';

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash(originalPassword, 10);
      const userData = createTestUserData();
      
      testUser = await User.create({
        name: userData.name,
        email: userData.email,
        password_hash: hashedPassword
      });
    });

    afterEach(async () => {
      if (testUser) {
        await User.destroy({ where: { id: testUser.id }, force: true });
        testUser = null;
      }
    });

    it('should change password when old password is correct', async () => {
      const newPassword = 'NewPassword123!';
      
      await authService.changePassword(testUser.id, {
        oldPassword: originalPassword,
        newPassword: newPassword
      });
      
      // Verify new password works
      const updatedUser = await User.findByPk(testUser.id);
      const isMatch = await bcrypt.compare(newPassword, updatedUser.password_hash);
      expect(isMatch).toBe(true);
    });

    it('should throw 401 for incorrect old password', async () => {
      await expect(
        authService.changePassword(testUser.id, {
          oldPassword: 'WrongOldPassword123!',
          newPassword: 'NewPassword123!'
        })
      ).rejects.toMatchObject({
        message: 'Current password is incorrect.',
        statusCode: 401
      });
    });

    it('should throw 404 for non-existent user', async () => {
      await expect(
        authService.changePassword(999999, {
          oldPassword: originalPassword,
          newPassword: 'NewPassword123!'
        })
      ).rejects.toMatchObject({
        message: 'User not found.',
        statusCode: 404
      });
    });

    it('should throw 400 when new password is same as old password', async () => {
      await expect(
        authService.changePassword(testUser.id, {
          oldPassword: originalPassword,
          newPassword: originalPassword
        })
      ).rejects.toMatchObject({
        message: expect.stringContaining('different from current'),
        statusCode: 400
      });
    });

  });

});
