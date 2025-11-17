'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserIssueFlag extends Model {
    static associate(models) {
      UserIssueFlag.belongsTo(models.UserIssue, {
        foreignKey: 'report_id',
        as: 'report'
      });

      UserIssueFlag.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });

      UserIssueFlag.belongsTo(models.Flag, {
        foreignKey: 'flag_id',
        as: 'flag'
      });
    }
  }

  UserIssueFlag.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    report_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    flag_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'UserIssueFlag',
    tableName: 'user_issue_flag',
    underscored: true,
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['report_id'], name: 'idx_user_issue_flag_report_id' }
    ]
  });

  return UserIssueFlag;
};
