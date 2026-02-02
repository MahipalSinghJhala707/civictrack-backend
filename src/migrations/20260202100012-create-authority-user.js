'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable('authority_user', {
        id: {
          type: Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true
        },
        authority_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: {
            model: 'authorities',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        user_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
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

      // Unique index on user_id - each user can belong to only one authority
      await queryInterface.addIndex('authority_user', ['user_id'], {
        unique: true,
        name: 'idx_authority_user_user_id_unique',
        transaction
      });

      // Index on authority_id for listing users of an authority
      await queryInterface.addIndex('authority_user', ['authority_id'], {
        name: 'idx_authority_user_authority_id',
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
      await queryInterface.dropTable('authority_user', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
