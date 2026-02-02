'use strict';

/**
 * Shared Utilities Tests: Soft Delete
 * 
 * Tests the soft delete utility invariants:
 * - assertNotDeleted throws for null/undefined or deleted entities
 * - isDeleted correctly identifies soft-deleted records
 * - isActive correctly identifies active records
 * - withDeletedRecords enables paranoid: false
 * - withoutDeletedRecords keeps paranoid: true
 */

process.env.NODE_ENV = 'test';

const {
  assertNotDeleted,
  isDeleted,
  isActive,
  applyParanoidInclude,
  withDeletedRecords,
  withoutDeletedRecords,
  excludeDeletedWhere
} = require('../../src/shared/utils/softDelete.js');

describe('Soft Delete Utility', () => {

  describe('assertNotDeleted', () => {
    
    it('should not throw for active entity (deleted_at is null)', () => {
      const entity = { id: 1, name: 'Test', deleted_at: null };
      
      expect(() => {
        assertNotDeleted(entity, 'TestEntity');
      }).not.toThrow();
    });

    it('should throw 404 for null entity', () => {
      expect(() => {
        assertNotDeleted(null, 'TestEntity');
      }).toThrow(/TestEntity not found/);

      try {
        assertNotDeleted(null, 'TestEntity');
      } catch (err) {
        expect(err.statusCode).toBe(404);
      }
    });

    it('should throw 404 for undefined entity', () => {
      expect(() => {
        assertNotDeleted(undefined, 'TestEntity');
      }).toThrow(/TestEntity not found/);
    });

    it('should throw 404 for soft-deleted entity (deleted_at is set)', () => {
      const entity = { id: 1, name: 'Test', deleted_at: new Date() };
      
      expect(() => {
        assertNotDeleted(entity, 'TestEntity');
      }).toThrow(/TestEntity not found/);
    });

    it('should handle camelCase deletedAt field', () => {
      const entity = { id: 1, name: 'Test', deletedAt: new Date() };
      
      expect(() => {
        assertNotDeleted(entity, 'TestEntity');
      }).toThrow(/TestEntity not found/);
    });

    it('should use default entity name "Record" when not provided', () => {
      expect(() => {
        assertNotDeleted(null);
      }).toThrow(/Record not found/);
    });

  });

  describe('isDeleted', () => {
    
    it('should return true for null entity', () => {
      expect(isDeleted(null)).toBe(true);
    });

    it('should return true for undefined entity', () => {
      expect(isDeleted(undefined)).toBe(true);
    });

    it('should return true for entity with deleted_at set', () => {
      const entity = { id: 1, deleted_at: new Date() };
      expect(isDeleted(entity)).toBe(true);
    });

    it('should return true for entity with deletedAt set (camelCase)', () => {
      const entity = { id: 1, deletedAt: new Date() };
      expect(isDeleted(entity)).toBe(true);
    });

    it('should return false for entity with deleted_at: null', () => {
      const entity = { id: 1, deleted_at: null };
      expect(isDeleted(entity)).toBe(false);
    });

    it('should return false for entity with deleted_at: undefined', () => {
      const entity = { id: 1, deleted_at: undefined };
      expect(isDeleted(entity)).toBe(false);
    });

    it('should return false for entity without deleted_at field', () => {
      const entity = { id: 1, name: 'Test' };
      expect(isDeleted(entity)).toBe(false);
    });

  });

  describe('isActive', () => {
    
    it('should return falsy for null entity', () => {
      expect(isActive(null)).toBeFalsy();
    });

    it('should return false for soft-deleted entity', () => {
      const entity = { id: 1, deleted_at: new Date() };
      expect(isActive(entity)).toBe(false);
    });

    it('should return true for active entity', () => {
      const entity = { id: 1, deleted_at: null };
      expect(isActive(entity)).toBe(true);
    });

    it('should return true for entity without deleted_at field', () => {
      const entity = { id: 1, name: 'Test' };
      expect(isActive(entity)).toBe(true);
    });

  });

  describe('applyParanoidInclude', () => {
    
    it('should add required: false by default', () => {
      const include = { model: 'TestModel', as: 'test' };
      
      const result = applyParanoidInclude(include);
      
      expect(result.required).toBe(false);
    });

    it('should set required: true when specified', () => {
      const include = { model: 'TestModel', as: 'test' };
      
      const result = applyParanoidInclude(include, { required: true });
      
      expect(result.required).toBe(true);
    });

    it('should not set paranoid: false by default', () => {
      const include = { model: 'TestModel', as: 'test' };
      
      const result = applyParanoidInclude(include);
      
      expect(result.paranoid).toBeUndefined();
    });

    it('should set paranoid: false when includeDeleted is true', () => {
      const include = { model: 'TestModel', as: 'test' };
      
      const result = applyParanoidInclude(include, { includeDeleted: true });
      
      expect(result.paranoid).toBe(false);
    });

    it('should preserve existing include options', () => {
      const include = { 
        model: 'TestModel', 
        as: 'test',
        attributes: ['id', 'name']
      };
      
      const result = applyParanoidInclude(include);
      
      expect(result.attributes).toEqual(['id', 'name']);
    });

  });

  describe('withDeletedRecords', () => {
    
    it('should set paranoid: false', () => {
      const options = { limit: 10 };
      
      const result = withDeletedRecords(options);
      
      expect(result.paranoid).toBe(false);
    });

    it('should preserve existing options', () => {
      const options = { 
        where: { status: 'active' },
        limit: 10 
      };
      
      const result = withDeletedRecords(options);
      
      expect(result.where).toEqual({ status: 'active' });
      expect(result.limit).toBe(10);
      expect(result.paranoid).toBe(false);
    });

    it('should work with empty options', () => {
      const result = withDeletedRecords({});
      
      expect(result).toEqual({ paranoid: false });
    });

  });

  describe('withoutDeletedRecords', () => {
    
    it('should set paranoid: true', () => {
      const options = { limit: 10 };
      
      const result = withoutDeletedRecords(options);
      
      expect(result.paranoid).toBe(true);
    });

    it('should override existing paranoid: false', () => {
      const options = { paranoid: false, limit: 10 };
      
      const result = withoutDeletedRecords(options);
      
      expect(result.paranoid).toBe(true);
    });

  });

  describe('excludeDeletedWhere', () => {
    
    it('should add deleted_at: null to where clause', () => {
      const where = { status: 'active' };
      
      const result = excludeDeletedWhere(where);
      
      expect(result).toEqual({
        status: 'active',
        deleted_at: null
      });
    });

    it('should work with empty where clause', () => {
      const result = excludeDeletedWhere({});
      
      expect(result).toEqual({ deleted_at: null });
    });

    it('should work with undefined where clause', () => {
      const result = excludeDeletedWhere();
      
      expect(result).toEqual({ deleted_at: null });
    });

  });

});
