'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Issue extends Model {
    static associate(models) {
      Issue.hasMany(models.UserIssue, {
        foreignKey: 'issue_id',
        as: 'reports'
      });
    }
  }

  Issue.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Issue',
    tableName: 'issues',
    underscored: true,
    timestamps: true
  });

  return Issue;
};
