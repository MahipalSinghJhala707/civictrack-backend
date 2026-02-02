'use strict';

/**
 * Shared Utilities Tests: Pagination
 * 
 * Tests the pagination utility invariants:
 * - Every entityType MUST have DEFAULT_ORDER defined
 * - Every entityType MUST have ALLOWED_SORT_FIELDS defined
 * - No query can execute without an ORDER BY clause
 * - Unknown entity types cause immediate failure
 * - Invalid pagination params are rejected
 */

// Set test environment before importing modules
process.env.NODE_ENV = 'test';

const {
  buildQueryOptions,
  extractPaginationContext,
  PAGINATION_DEFAULTS
} = require('../../src/shared/utils/pagination.js');

describe('Pagination Utility', () => {
  
  describe('Configuration Invariants', () => {
    
    it('should have PAGINATION_DEFAULTS defined with page, limit, and maxLimit', () => {
      expect(PAGINATION_DEFAULTS).toBeDefined();
      expect(PAGINATION_DEFAULTS.page).toBe(1);
      expect(PAGINATION_DEFAULTS.limit).toBe(20);
      expect(PAGINATION_DEFAULTS.maxLimit).toBe(100);
    });
    
  });

  describe('buildQueryOptions', () => {
    
    it('should throw error when entityType is not provided', () => {
      expect(() => {
        buildQueryOptions({});
      }).toThrow(/entityType is required/);
    });

    it('should throw error for unknown entityType', () => {
      expect(() => {
        buildQueryOptions({ entityType: 'unknownEntity' });
      }).toThrow(/Unknown entity type/);
    });

    it('should return valid query options for known entityType "issues"', () => {
      const options = buildQueryOptions({ entityType: 'issues' });
      
      expect(options).toHaveProperty('limit');
      expect(options).toHaveProperty('offset');
      expect(options).toHaveProperty('order');
      expect(options.order.length).toBeGreaterThan(0);
    });

    it('should return valid query options for entityType "users"', () => {
      // buildQueryOptions expects a complete pagination context
      // limit and offset come from extractPaginationContext
      const context = extractPaginationContext({ query: {} }, 'users');
      const options = buildQueryOptions(context);
      
      expect(options.limit).toBe(PAGINATION_DEFAULTS.limit);
      expect(options.offset).toBe(0);
      expect(options.order).toEqual([['createdAt', 'DESC']]);
    });

    it('should return valid query options for entityType "authorities"', () => {
      const options = buildQueryOptions({ entityType: 'authorities' });
      
      expect(options.order).toEqual([['createdAt', 'DESC']]);
    });

    it('should return valid query options for entityType "flaggedReports"', () => {
      const options = buildQueryOptions({ entityType: 'flaggedReports' });
      
      // Flagged reports default to updatedAt DESC
      expect(options.order).toEqual([['updatedAt', 'DESC']]);
    });

    it('should use custom page and limit when provided', () => {
      const context = extractPaginationContext(
        { query: { page: '3', limit: '50' } },
        'issues'
      );
      const options = buildQueryOptions(context);
      
      expect(options.limit).toBe(50);
      expect(options.offset).toBe(100); // (page - 1) * limit = (3-1) * 50 = 100
    });

    it('should enforce maxLimit when limit exceeds maximum', () => {
      // extractPaginationContext throws error when limit exceeds maxLimit
      expect(() => {
        extractPaginationContext(
          { query: { limit: '500' } }, // Exceeds maxLimit of 100
          'issues'
        );
      }).toThrow(/limit cannot exceed/);
    });

    it('should use default order when sortBy is not provided', () => {
      const options = buildQueryOptions({ entityType: 'issues' });
      
      expect(options.order).toEqual([['createdAt', 'DESC']]);
    });

    it('should use custom sortBy when field is allowed', () => {
      const options = buildQueryOptions({
        entityType: 'issues',
        sortBy: 'updatedAt',
        sortOrder: 'ASC'
      });
      
      expect(options.order).toEqual([['updatedAt', 'ASC']]);
    });

    it('should reject sortBy field not in allowed list', () => {
      expect(() => {
        // Validation happens in extractPaginationContext
        extractPaginationContext(
          { query: { sortBy: 'hackField' } },
          'issues'
        );
      }).toThrow(/Invalid sortBy field/);
    });

    it('should reject invalid sortOrder value', () => {
      expect(() => {
        // Validation happens in extractPaginationContext
        extractPaginationContext(
          { query: { sortBy: 'createdAt', sortOrder: 'INVALID' } },
          'issues'
        );
      }).toThrow(/Invalid sortOrder/);
    });

  });

  describe('extractPaginationContext', () => {
    
    it('should extract pagination from query params', () => {
      const req = {
        query: {
          page: '2',
          limit: '30',
          sortBy: 'createdAt',
          sortOrder: 'ASC'
        }
      };
      
      const context = extractPaginationContext(req, 'issues');
      
      expect(context.page).toBe(2);
      expect(context.limit).toBe(30);
      expect(context.sortBy).toBe('createdAt');
      expect(context.sortOrder).toBe('ASC');
    });

    it('should use defaults when query params not provided', () => {
      const req = { query: {} };
      
      const context = extractPaginationContext(req, 'issues');
      
      expect(context.page).toBe(PAGINATION_DEFAULTS.page);
      expect(context.limit).toBe(PAGINATION_DEFAULTS.limit);
    });

    it('should throw error for invalid page value (non-numeric)', () => {
      const req = {
        query: { page: 'abc' }
      };
      
      expect(() => {
        extractPaginationContext(req, 'issues');
      }).toThrow(/page must be a positive integer/);
    });

    it('should throw error for page less than 1', () => {
      const req = {
        query: { page: '0' }
      };
      
      expect(() => {
        extractPaginationContext(req, 'issues');
      }).toThrow(/page must be a positive integer/);
    });

    it('should throw error for negative limit', () => {
      const req = {
        query: { limit: '-5' }
      };
      
      expect(() => {
        extractPaginationContext(req, 'issues');
      }).toThrow(/limit must be a positive integer/);
    });

  });

});
