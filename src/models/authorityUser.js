'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AuthorityUser extends Model {
    static associate(models) {
      AuthorityUser.belongsTo(models.Authority, {
        foreignKey: 'authority_id',
        as: 'authority'
      });

      AuthorityUser.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }

  AuthorityUser.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    authority_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'AuthorityUser',
    tableName: 'authority_user',
    underscored: true,
    timestamps: true
  });

  return AuthorityUser;
};
