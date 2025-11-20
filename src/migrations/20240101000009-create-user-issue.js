'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
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

    await queryInterface.addIndex('user_issue', ['status'], {
      name: 'idx_user_issue_status'
    });

    await queryInterface.addIndex('user_issue', ['authority_id'], {
      name: 'idx_user_issue_authority'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_issue');
  }
};

