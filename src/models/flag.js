'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Flag extends Model {
    static associate(models) {
      Flag.hasMany(models.UserIssueFlag, {
        foreignKey: 'flag_id',
        as: 'userFlags'
      });
    }
  }

  Flag.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Flag',
    tableName: 'flags',
    underscored: true,
    timestamps: true,
    paranoid: true
  });

  return Flag;
};
