'use strict';

/**
 * Migration: Add Query-Aligned Indexes
 * 
 * PURPOSE:
 * Align database indexes precisely with real query paths to ensure
 * predictable performance at scale.
 * 
 * QUERY PATH ANALYSIS:
 * 
 * 1. UserIssue (reports) table:
 *    - Admin list: WHERE city_id = ? [AND deleted_at IS NULL] ORDER BY created_at DESC
 *    - Admin list with status: WHERE city_id = ? AND status = ? ORDER BY created_at DESC
 *    - Authority view: WHERE authority_id = ? ORDER BY created_at DESC
 *    - Citizen view: WHERE is_hidden = false [AND reporter_id = ?] ORDER BY created_at DESC
 *    - Flagged reports: WHERE city_id = ? ORDER BY updated_at DESC
 * 
 * 2. Authority table:
 *    - Admin list: WHERE city_id = ? [AND deleted_at IS NULL] ORDER BY created_at DESC
 *    - Assignment lookup: WHERE city_id = ? AND id IN (...) [AND region = ?]
 * 
 * 3. User table:
 *    - Admin list: WHERE city_id = ? [AND deleted_at IS NULL] ORDER BY created_at DESC
 * 
 * 4. AuthorityIssue table:
 *    - Assignment engine: WHERE issue_id = ? (find authorities for issue category)
 * 
 * 5. AuthorityUser table:
 *    - Already optimized with unique index on user_id
 * 
 * SOFT-DELETE CONSIDERATION:
 * - Partial indexes with WHERE deleted_at IS NULL optimize common read paths
 * - Full indexes still exist for admin audit queries with includeDeleted=true
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // ============================================================
      // USER_ISSUE TABLE INDEXES
      // ============================================================

      /**
       * Index: idx_user_issue_city_created_active
       * 
       * Query path: Admin list reports by city with default ordering
       * SQL: SELECT * FROM user_issue 
       *      WHERE city_id = ? AND deleted_at IS NULL 
       *      ORDER BY created_at DESC
       * 
       * Partial index excludes soft-deleted records for optimal read performance
       */
      await queryInterface.addIndex('user_issue', ['city_id', 'created_at'], {
        name: 'idx_user_issue_city_created_active',
        order: [['city_id', 'ASC'], ['created_at', 'DESC']],
        where: { deleted_at: null },
        transaction
      });

      /**
       * Index: idx_user_issue_city_status_created_active
       * 
       * Query path: Admin list reports filtered by status
       * SQL: SELECT * FROM user_issue 
       *      WHERE city_id = ? AND status = ? AND deleted_at IS NULL 
       *      ORDER BY created_at DESC
       * 
       * Covers the most common admin filter combination
       */
      await queryInterface.addIndex('user_issue', ['city_id', 'status', 'created_at'], {
        name: 'idx_user_issue_city_status_created_active',
        order: [['city_id', 'ASC'], ['status', 'ASC'], ['created_at', 'DESC']],
        where: { deleted_at: null },
        transaction
      });

      /**
       * Index: idx_user_issue_authority_created_active
       * 
       * Query path: Authority user viewing their assigned issues
       * SQL: SELECT * FROM user_issue 
       *      WHERE authority_id = ? AND deleted_at IS NULL 
       *      ORDER BY created_at DESC
       */
      await queryInterface.addIndex('user_issue', ['authority_id', 'created_at'], {
        name: 'idx_user_issue_authority_created_active',
        order: [['authority_id', 'ASC'], ['created_at', 'DESC']],
        where: { deleted_at: null },
        transaction
      });

      /**
       * Index: idx_user_issue_reporter_hidden_created_active
       * 
       * Query path: Citizen viewing their own issues
       * SQL: SELECT * FROM user_issue 
       *      WHERE reporter_id = ? AND is_hidden = false AND deleted_at IS NULL 
       *      ORDER BY created_at DESC
       * 
       * Also supports: WHERE is_hidden = false ORDER BY created_at DESC (public list)
       */
      await queryInterface.addIndex('user_issue', ['reporter_id', 'is_hidden', 'created_at'], {
        name: 'idx_user_issue_reporter_hidden_created_active',
        order: [['reporter_id', 'ASC'], ['is_hidden', 'ASC'], ['created_at', 'DESC']],
        where: { deleted_at: null },
        transaction
      });

      /**
       * Index: idx_user_issue_city_updated_active
       * 
       * Query path: Flagged reports list (default order is updated_at DESC)
       * SQL: SELECT * FROM user_issue 
       *      WHERE city_id = ? AND deleted_at IS NULL 
       *      ORDER BY updated_at DESC
       */
      await queryInterface.addIndex('user_issue', ['city_id', 'updated_at'], {
        name: 'idx_user_issue_city_updated_active',
        order: [['city_id', 'ASC'], ['updated_at', 'DESC']],
        where: { deleted_at: null },
        transaction
      });

      /**
       * Index: idx_user_issue_hidden_created_active
       * 
       * Query path: Citizen public list (all visible issues)
       * SQL: SELECT * FROM user_issue 
       *      WHERE is_hidden = false AND deleted_at IS NULL 
       *      ORDER BY created_at DESC
       */
      await queryInterface.addIndex('user_issue', ['is_hidden', 'created_at'], {
        name: 'idx_user_issue_hidden_created_active',
        order: [['is_hidden', 'ASC'], ['created_at', 'DESC']],
        where: { deleted_at: null },
        transaction
      });

      // ============================================================
      // AUTHORITY TABLE INDEXES
      // ============================================================

      /**
       * Index: idx_authority_city_created_active
       * 
       * Query path: Admin list authorities by city
       * SQL: SELECT * FROM authorities 
       *      WHERE city_id = ? AND deleted_at IS NULL 
       *      ORDER BY created_at DESC
       */
      await queryInterface.addIndex('authorities', ['city_id', 'created_at'], {
        name: 'idx_authority_city_created_active',
        order: [['city_id', 'ASC'], ['created_at', 'DESC']],
        where: { deleted_at: null },
        transaction
      });

      /**
       * Index: idx_authority_city_region_active
       * 
       * Query path: Assignment engine - find authority by city and region
       * SQL: SELECT * FROM authorities 
       *      WHERE city_id = ? AND id IN (...) AND region ILIKE ?
       *      AND deleted_at IS NULL
       * 
       * Supports region-based assignment matching
       */
      await queryInterface.addIndex('authorities', ['city_id', 'region'], {
        name: 'idx_authority_city_region_active',
        where: { deleted_at: null },
        transaction
      });

      // ============================================================
      // USER TABLE INDEXES
      // ============================================================

      /**
       * Index: idx_users_city_created_active
       * 
       * Query path: Admin list users by city
       * SQL: SELECT * FROM users 
       *      WHERE city_id = ? AND deleted_at IS NULL 
       *      ORDER BY created_at DESC
       */
      await queryInterface.addIndex('users', ['city_id', 'created_at'], {
        name: 'idx_users_city_created_active',
        order: [['city_id', 'ASC'], ['created_at', 'DESC']],
        where: { deleted_at: null },
        transaction
      });

      // ============================================================
      // AUTHORITY_ISSUE TABLE INDEXES  
      // ============================================================

      /**
       * Index: idx_authority_issue_issue_active
       * 
       * Query path: Assignment engine - find authorities for issue category
       * SQL: SELECT * FROM authority_issue 
       *      WHERE issue_id = ? AND deleted_at IS NULL
       * 
       * Critical for assignment performance
       */
      await queryInterface.addIndex('authority_issue', ['issue_id'], {
        name: 'idx_authority_issue_issue_active',
        where: { deleted_at: null },
        transaction
      });

      // ============================================================
      // AUTHORITY_USER TABLE INDEXES
      // ============================================================

      /**
       * Index: idx_authority_user_authority_created_active
       * 
       * Query path: List users of an authority with ordering
       * SQL: SELECT * FROM authority_user 
       *      WHERE authority_id = ? AND deleted_at IS NULL
       *      ORDER BY created_at DESC
       */
      await queryInterface.addIndex('authority_user', ['authority_id', 'created_at'], {
        name: 'idx_authority_user_authority_created_active',
        order: [['authority_id', 'ASC'], ['created_at', 'DESC']],
        where: { deleted_at: null },
        transaction
      });

      // ============================================================
      // USER_ISSUE_FLAG TABLE INDEXES
      // ============================================================

      /**
       * Index: idx_user_issue_flag_report_active
       * 
       * Query path: Fetch flags for a report
       * SQL: SELECT * FROM user_issue_flag 
       *      WHERE report_id = ? AND deleted_at IS NULL
       * 
       * Replaces the non-partial existing index for read queries
       */
      await queryInterface.addIndex('user_issue_flag', ['report_id'], {
        name: 'idx_user_issue_flag_report_active',
        where: { deleted_at: null },
        transaction
      });

      // ============================================================
      // LOGS TABLE INDEXES
      // ============================================================

      /**
       * Index: idx_logs_issue_created_active
       * 
       * Query path: Fetch logs for a report (ordered by time)
       * SQL: SELECT * FROM logs 
       *      WHERE issue_id = ? AND deleted_at IS NULL
       *      ORDER BY created_at ASC
       */
      await queryInterface.addIndex('logs', ['issue_id', 'created_at'], {
        name: 'idx_logs_issue_created_active',
        order: [['issue_id', 'ASC'], ['created_at', 'ASC']],
        where: { deleted_at: null },
        transaction
      });

      // ============================================================
      // ISSUE_IMAGES TABLE INDEXES
      // ============================================================

      /**
       * Index: idx_issue_images_report_active
       * 
       * Query path: Fetch images for a report
       * SQL: SELECT * FROM issue_images 
       *      WHERE report_id = ? AND deleted_at IS NULL
       */
      await queryInterface.addIndex('issue_images', ['report_id'], {
        name: 'idx_issue_images_report_active',
        where: { deleted_at: null },
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Remove all indexes in reverse order
      await queryInterface.removeIndex('issue_images', 'idx_issue_images_report_active', { transaction });
      await queryInterface.removeIndex('logs', 'idx_logs_issue_created_active', { transaction });
      await queryInterface.removeIndex('user_issue_flag', 'idx_user_issue_flag_report_active', { transaction });
      await queryInterface.removeIndex('authority_user', 'idx_authority_user_authority_created_active', { transaction });
      await queryInterface.removeIndex('authority_issue', 'idx_authority_issue_issue_active', { transaction });
      await queryInterface.removeIndex('users', 'idx_users_city_created_active', { transaction });
      await queryInterface.removeIndex('authorities', 'idx_authority_city_region_active', { transaction });
      await queryInterface.removeIndex('authorities', 'idx_authority_city_created_active', { transaction });
      await queryInterface.removeIndex('user_issue', 'idx_user_issue_hidden_created_active', { transaction });
      await queryInterface.removeIndex('user_issue', 'idx_user_issue_city_updated_active', { transaction });
      await queryInterface.removeIndex('user_issue', 'idx_user_issue_reporter_hidden_created_active', { transaction });
      await queryInterface.removeIndex('user_issue', 'idx_user_issue_authority_created_active', { transaction });
      await queryInterface.removeIndex('user_issue', 'idx_user_issue_city_status_created_active', { transaction });
      await queryInterface.removeIndex('user_issue', 'idx_user_issue_city_created_active', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
