'use strict';

/**
 * Shared Utilities Tests: City Scope
 * 
 * Tests the city scope utility invariants:
 * - City scope is required unless explicitly requesting all cities
 * - validateCityScope throws error when neither cityId nor includeAllCities is provided
 * - City filter is applied correctly to where clauses
 * - Paranoid options respect includeDeleted flag
 */

process.env.NODE_ENV = 'test';

const {
  extractAdminContext,
  validateCityScope,
  buildCityFilter,
  applyCityFilter,
  withCityScope,
  buildParanoidOptions,
  withAdminScope
} = require('../../src/shared/utils/cityScope.js');

describe('City Scope Utility', () => {

  describe('extractAdminContext', () => {
    
    it('should extract cityId from query params', () => {
      const req = {
        query: { cityId: '5' },
        body: {},
        user: {}
      };
      
      const context = extractAdminContext(req);
      
      expect(context.adminCityId).toBe(5);
      expect(context.includeAllCities).toBe(false);
      expect(context.includeDeleted).toBe(false);
    });

    it('should extract cityId from body when query is empty', () => {
      const req = {
        query: {},
        body: { cityId: 10 },
        user: {}
      };
      
      const context = extractAdminContext(req);
      
      expect(context.adminCityId).toBe(10);
    });

    it('should fallback to user city_id when query and body are empty', () => {
      const req = {
        query: {},
        body: {},
        user: { city_id: 15 }
      };
      
      const context = extractAdminContext(req);
      
      expect(context.adminCityId).toBe(15);
    });

    it('should prioritize query param over body and user city', () => {
      const req = {
        query: { cityId: '1' },
        body: { cityId: 2 },
        user: { city_id: 3 }
      };
      
      const context = extractAdminContext(req);
      
      expect(context.adminCityId).toBe(1);
    });

    it('should set includeAllCities to true when query param is "true"', () => {
      const req = {
        query: { includeAllCities: 'true' },
        body: {},
        user: {}
      };
      
      const context = extractAdminContext(req);
      
      expect(context.includeAllCities).toBe(true);
    });

    it('should set includeAllCities to true when body value is boolean true', () => {
      const req = {
        query: {},
        body: { includeAllCities: true },
        user: {}
      };
      
      const context = extractAdminContext(req);
      
      expect(context.includeAllCities).toBe(true);
    });

    it('should set includeDeleted to true when explicitly requested', () => {
      const req = {
        query: { includeDeleted: 'true' },
        body: {},
        user: {}
      };
      
      const context = extractAdminContext(req);
      
      expect(context.includeDeleted).toBe(true);
    });

    it('should default includeDeleted to false when not provided', () => {
      const req = {
        query: {},
        body: {},
        user: {}
      };
      
      const context = extractAdminContext(req);
      
      expect(context.includeDeleted).toBe(false);
    });

  });

  describe('validateCityScope', () => {
    
    it('should not throw when adminCityId is provided', () => {
      expect(() => {
        validateCityScope({ adminCityId: 5, includeAllCities: false });
      }).not.toThrow();
    });

    it('should not throw when includeAllCities is true', () => {
      expect(() => {
        validateCityScope({ adminCityId: null, includeAllCities: true });
      }).not.toThrow();
    });

    it('should throw when neither cityId nor includeAllCities is provided', () => {
      expect(() => {
        validateCityScope({ adminCityId: null, includeAllCities: false });
      }).toThrow(/Please select a city/);
    });

    it('should throw with status code 400', () => {
      try {
        validateCityScope({ adminCityId: null, includeAllCities: false });
      } catch (err) {
        expect(err.statusCode).toBe(400);
      }
    });

  });

  describe('buildCityFilter', () => {
    
    it('should return city filter when cityId is provided', () => {
      const filter = buildCityFilter(
        { adminCityId: 5, includeAllCities: false },
        'city_id'
      );
      
      expect(filter).toEqual({ city_id: 5 });
    });

    it('should return null when includeAllCities is true', () => {
      const filter = buildCityFilter(
        { adminCityId: 5, includeAllCities: true },
        'city_id'
      );
      
      expect(filter).toBeNull();
    });

    it('should use custom field name', () => {
      const filter = buildCityFilter(
        { adminCityId: 10, includeAllCities: false },
        'location_city_id'
      );
      
      expect(filter).toEqual({ location_city_id: 10 });
    });

  });

  describe('applyCityFilter', () => {
    
    it('should merge city filter with existing where clause', () => {
      const whereClause = { status: 'active' };
      const context = { adminCityId: 5, includeAllCities: false };
      
      const result = applyCityFilter(whereClause, context, 'city_id');
      
      expect(result).toEqual({
        status: 'active',
        city_id: 5
      });
    });

    it('should not modify where clause when includeAllCities is true', () => {
      const whereClause = { status: 'active' };
      const context = { adminCityId: 5, includeAllCities: true };
      
      const result = applyCityFilter(whereClause, context, 'city_id');
      
      expect(result).toEqual({ status: 'active' });
    });

    it('should return empty object with city filter when where is empty', () => {
      const context = { adminCityId: 5, includeAllCities: false };
      
      const result = applyCityFilter({}, context, 'city_id');
      
      expect(result).toEqual({ city_id: 5 });
    });

  });

  describe('buildParanoidOptions', () => {
    
    it('should return paranoid: true by default', () => {
      const options = buildParanoidOptions({});
      
      expect(options).toEqual({ paranoid: true });
    });

    it('should return paranoid: false when includeDeleted is true', () => {
      const options = buildParanoidOptions({ includeDeleted: true });
      
      expect(options).toEqual({ paranoid: false });
    });

    it('should return paranoid: true when includeDeleted is false', () => {
      const options = buildParanoidOptions({ includeDeleted: false });
      
      expect(options).toEqual({ paranoid: true });
    });

    it('should return paranoid: true when context is null', () => {
      const options = buildParanoidOptions(null);
      
      expect(options).toEqual({ paranoid: true });
    });

  });

  describe('withCityScope', () => {
    
    it('should add city filter to query options', () => {
      const options = { limit: 10 };
      const context = { adminCityId: 5, includeAllCities: false };
      
      const result = withCityScope(options, context, 'city_id');
      
      expect(result).toEqual({
        limit: 10,
        where: { city_id: 5 }
      });
    });

    it('should preserve existing where clause', () => {
      const options = { 
        limit: 10,
        where: { status: 'active' }
      };
      const context = { adminCityId: 5, includeAllCities: false };
      
      const result = withCityScope(options, context, 'city_id');
      
      expect(result.where).toEqual({
        status: 'active',
        city_id: 5
      });
    });

  });

  describe('withAdminScope', () => {
    
    it('should combine city scope and paranoid options', () => {
      const options = { limit: 10 };
      const context = { 
        adminCityId: 5, 
        includeAllCities: false,
        includeDeleted: false
      };
      
      const result = withAdminScope(options, context, 'city_id');
      
      expect(result).toEqual({
        limit: 10,
        where: { city_id: 5 },
        paranoid: true
      });
    });

    it('should set paranoid: false when includeDeleted is true', () => {
      const options = {};
      const context = { 
        adminCityId: 5, 
        includeAllCities: false,
        includeDeleted: true
      };
      
      const result = withAdminScope(options, context, 'city_id');
      
      expect(result.paranoid).toBe(false);
    });

  });

});
