'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Department extends Model {
    static associate(models) {
      Department.hasMany(models.Authority, {
        foreignKey: 'department_id',
        as: 'authorities'
      });
    }
  }

  Department.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Department',
    tableName: 'departments',
    underscored: true,
    timestamps: true,
    paranoid: true
  });

  return Department;
};
