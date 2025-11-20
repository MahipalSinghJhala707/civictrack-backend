'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('authority_issue', {
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
      issue_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'issues',
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
    });

    await queryInterface.addIndex('authority_issue', ['authority_id', 'issue_id'], {
      unique: true,
      name: 'idx_authority_issue_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('authority_issue');
  }
};

