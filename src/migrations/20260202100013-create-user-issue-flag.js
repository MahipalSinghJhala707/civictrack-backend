'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable('user_issue_flag', {
        id: {
          type: Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true
        },
        report_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: {
            model: 'user_issue',
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
        flag_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: {
            model: 'flags',
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

      // Index on report_id for fetching flags by issue
      await queryInterface.addIndex('user_issue_flag', ['report_id'], {
        name: 'idx_user_issue_flag_report_id',
        transaction
      });

      // Unique composite index to prevent duplicate flags by same user
      await queryInterface.addIndex('user_issue_flag', ['report_id', 'user_id', 'flag_id'], {
        unique: true,
        name: 'idx_user_issue_flag_unique',
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
      await queryInterface.dropTable('user_issue_flag', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
