'use strict';

/**
 * Test Helpers
 * 
 * Provides utilities for setting up and tearing down test state.
 * All tests should use transactions that rollback to avoid state leakage.
 */

const { sequelize } = require('../../src/models');

/**
 * Create a transaction-wrapped test context
 * All database operations within the callback run in a transaction
 * that is rolled back after the test completes
 * 
 * @param {Function} testFn - Async test function receiving transaction
 * @returns {Promise<void>}
 */
async function withTransaction(testFn) {
  const transaction = await sequelize.transaction();
  try {
    await testFn(transaction);
  } finally {
    await transaction.rollback();
  }
}

/**
 * Create a test transaction that can be used in beforeEach/afterEach
 * Returns transaction management functions
 * 
 * @returns {Object} { getTransaction, startTransaction, rollbackTransaction }
 */
function createTransactionManager() {
  let transaction = null;

  return {
    getTransaction: () => transaction,
    
    startTransaction: async () => {
      transaction = await sequelize.transaction();
      return transaction;
    },
    
    rollbackTransaction: async () => {
      if (transaction) {
        await transaction.rollback();
        transaction = null;
      }
    }
  };
}

/**
 * Ensure database connection is established
 * Call in beforeAll of test suites that need DB
 */
async function ensureDbConnection() {
  await sequelize.authenticate();
}

/**
 * Close database connection
 * Call in afterAll of test suites
 */
async function closeDbConnection() {
  await sequelize.close();
}

/**
 * Create test user data with unique email
 * 
 * @param {Object} overrides - Override default values
 * @returns {Object} User data object
 */
function createTestUserData(overrides = {}) {
  const suffix = Date.now() + Math.random().toString(36).substring(7);
  return {
    name: 'Test User',
    email: `testuser_${suffix}@example.com`,
    password: 'TestPassword123!',
    ...overrides
  };
}

/**
 * Create test authority data
 * 
 * @param {Object} overrides - Override default values
 * @returns {Object} Authority data object
 */
function createTestAuthorityData(overrides = {}) {
  const suffix = Date.now();
  return {
    name: `Test Authority ${suffix}`,
    city: 'Test City',
    region: 'Test Region',
    ...overrides
  };
}

/**
 * Create test issue report data
 * 
 * @param {Object} overrides - Override default values
 * @returns {Object} Issue report data object
 */
function createTestReportData(overrides = {}) {
  return {
    title: 'Test Issue Report',
    description: 'This is a test issue report for unit testing.',
    latitude: 28.6139,
    longitude: 77.2090,
    region: 'Test Region',
    status: 'reported',
    is_hidden: false,
    ...overrides
  };
}

module.exports = {
  withTransaction,
  createTransactionManager,
  ensureDbConnection,
  closeDbConnection,
  createTestUserData,
  createTestAuthorityData,
  createTestReportData
};
