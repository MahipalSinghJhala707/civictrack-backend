'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('issue_images', {
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
      url: {
        type: Sequelize.TEXT,
        allowNull: false
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
    });

    await queryInterface.addIndex('issue_images', ['report_id'], {
      name: 'idx_issue_images_report_id'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('issue_images');
  }
};

