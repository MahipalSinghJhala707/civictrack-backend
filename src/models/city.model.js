'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class City extends Model {
    static associate(models) {
      City.hasMany(models.User, {
        foreignKey: 'city_id',
        as: 'users'
      });

      City.hasMany(models.Authority, {
        foreignKey: 'city_id',
        as: 'authorities'
      });

      City.hasMany(models.UserIssue, {
        foreignKey: 'city_id',
        as: 'issues'
      });
    }
  }

  City.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'India'
    }
  }, {
    sequelize,
    modelName: 'City',
    tableName: 'cities',
    underscored: true,
    timestamps: true,
    paranoid: true
  });

  return City;
};
