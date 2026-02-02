'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Create ENUM type for status
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_user_issue_status" AS ENUM ('reported', 'in_progress', 'resolved', 'rejected');`,
        { transaction }
      );

      await queryInterface.createTable('user_issue', {
        id: {
          type: Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true
        },
        title: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        issue_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: {
            model: 'issues',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        reporter_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        authority_id: {
          type: Sequelize.BIGINT,
          allowNull: true,
          references: {
            model: 'authorities',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        latitude: {
          type: Sequelize.DOUBLE,
          allowNull: true
        },
        longitude: {
          type: Sequelize.DOUBLE,
          allowNull: true
        },
        region: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('reported', 'in_progress', 'resolved', 'rejected'),
          allowNull: false,
          defaultValue: 'reported'
        },
        is_hidden: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        city_id: {
          type: Sequelize.BIGINT,
          allowNull: true,
          references: {
            model: 'cities',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      // Index on issue_id for filtering by issue type
      await queryInterface.addIndex('user_issue', ['issue_id'], {
        name: 'idx_user_issue_issue_id',
        transaction
      });

      // Index on reporter_id for user's reported issues
      await queryInterface.addIndex('user_issue', ['reporter_id'], {
        name: 'idx_user_issue_reporter_id',
        transaction
      });

      // Index on authority_id for authority's assigned issues
      await queryInterface.addIndex('user_issue', ['authority_id'], {
        name: 'idx_user_issue_authority_id',
        transaction
      });

      // Index on status for filtering
      await queryInterface.addIndex('user_issue', ['status'], {
        name: 'idx_user_issue_status',
        transaction
      });

      // Index on city_id for city-based filtering
      await queryInterface.addIndex('user_issue', ['city_id'], {
        name: 'idx_user_issue_city_id',
        transaction
      });

      // Composite index for common queries (status + city)
      await queryInterface.addIndex('user_issue', ['city_id', 'status'], {
        name: 'idx_user_issue_city_status',
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
      await queryInterface.dropTable('user_issue', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_user_issue_status";', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
