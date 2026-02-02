'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable('users', {
        id: {
          type: Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        email: {
          type: Sequelize.STRING(150),
          allowNull: false
        },
        password_hash: {
          type: Sequelize.STRING(255),
          allowNull: false
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

      // Unique index on email
      await queryInterface.addIndex('users', ['email'], {
        unique: true,
        name: 'idx_users_email_unique',
        transaction
      });

      // Index on city_id for filtering users by city
      await queryInterface.addIndex('users', ['city_id'], {
        name: 'idx_users_city_id',
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
      await queryInterface.dropTable('users', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
