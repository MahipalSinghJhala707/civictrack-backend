'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsToMany(models.Role, {
        through: models.UserRole,
        foreignKey: 'user_id',
        otherKey: 'role_id',
        as: 'roles'
      });

      User.hasMany(models.UserIssue, {
        foreignKey: 'reporter_id',
        as: 'reportedIssues'
      });

      User.hasMany(models.Log, {
        foreignKey: 'updated_by',
        as: 'logs'
      });

      User.hasMany(models.UserIssueFlag, {
        foreignKey: 'user_id',
        as: 'issueFlags'
      });

      User.hasOne(models.AuthorityUser, {
        foreignKey: 'user_id',
        as: 'authorityUser'
      });
    }
  }

  User.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    timestamps: true,
    paranoid: true
  });

  return User;
};
