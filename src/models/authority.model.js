'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Authority extends Model {
    static associate(models) {
      Authority.belongsTo(models.Department, {
        foreignKey: 'department_id',
        as: 'department'
      });

      Authority.hasMany(models.UserIssue, {
        foreignKey: 'authority_id',
        as: 'issues'
      });

      Authority.hasMany(models.AuthorityUser, {
        foreignKey: 'authority_id',
        as: 'authorityUsers'
      });
    }
  }

  Authority.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    region: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    department_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Authority',
    tableName: 'authorities',
    underscored: true,
    timestamps: true,
    paranoid: true
  });

  return Authority;
};
