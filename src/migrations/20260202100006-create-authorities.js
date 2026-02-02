'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable('authorities', {
        id: {
          type: Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING(150),
          allowNull: false
        },
        city: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        region: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        department_id: {
          type: Sequelize.BIGINT,
          allowNull: true,
          references: {
            model: 'departments',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        address: {
          type: Sequelize.TEXT,
          allowNull: true
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

      // Index on department_id for lookups
      await queryInterface.addIndex('authorities', ['department_id'], {
        name: 'idx_authorities_department_id',
        transaction
      });

      // Index on city_id for filtering by city
      await queryInterface.addIndex('authorities', ['city_id'], {
        name: 'idx_authorities_city_id',
        transaction
      });

      // Index on city and region for location-based queries
      await queryInterface.addIndex('authorities', ['city', 'region'], {
        name: 'idx_authorities_city_region',
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
      await queryInterface.dropTable('authorities', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
