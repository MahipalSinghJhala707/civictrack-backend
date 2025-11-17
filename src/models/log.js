'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Log extends Model {
    static associate(models) {
      Log.belongsTo(models.UserIssue, {
        foreignKey: 'issue_id',
        as: 'issue'
      });

      Log.belongsTo(models.User, {
        foreignKey: 'updated_by',
        as: 'updatedBy'
      });
    }
  }

  Log.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    issue_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    updated_by: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    from_status: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    to_status: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Log',
    tableName: 'logs',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['issue_id'], name: 'idx_logs_issue_id' }
    ]
  });

  return Log;
};
