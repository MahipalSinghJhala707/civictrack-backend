'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserIssue extends Model {
    static associate(models) {
      UserIssue.belongsTo(models.Issue, {
        foreignKey: 'issue_id',
        as: 'issue'
      });

      UserIssue.belongsTo(models.User, {
        foreignKey: 'reporter_id',
        as: 'reporter'
      });

      UserIssue.belongsTo(models.Authority, {
        foreignKey: 'authority_id',
        as: 'authority'
      });

      UserIssue.hasMany(models.IssueImage, {
        foreignKey: 'report_id',
        as: 'images'
      });

      UserIssue.hasMany(models.UserIssueFlag, {
        foreignKey: 'report_id',
        as: 'flags'
      });

      UserIssue.hasMany(models.Log, {
        foreignKey: 'issue_id',
        as: 'logs'
      });
    }
  }

  UserIssue.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    issue_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    reporter_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    authority_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    region: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('reported', 'in_progress', 'resolved', 'rejected'),
      allowNull: false,
      defaultValue: 'reported'
    },
    is_hidden: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'UserIssue',
    tableName: 'user_issue',
    underscored: true,
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['status'], name: 'idx_user_issue_status' },
      { fields: ['authority_id'], name: 'idx_user_issue_authority' }
    ]
  });

  return UserIssue;
};
