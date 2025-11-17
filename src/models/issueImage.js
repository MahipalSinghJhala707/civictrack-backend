'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class IssueImage extends Model {
    static associate(models) {
      IssueImage.belongsTo(models.UserIssue, {
        foreignKey: 'report_id',
        as: 'report'
      });
    }
  }

  IssueImage.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    report_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'IssueImage',
    tableName: 'issue_images',
    underscored: true,
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['report_id'], name: 'idx_issue_images_report_id' }
    ]
  });

  return IssueImage;
};
