module.exports = (sequelize, DataTypes) => {
  const AuthorityIssue = sequelize.define(
    "AuthorityIssue",
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      authority_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      issue_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
    },
    {
      tableName: "authority_issue",
      timestamps: true, 
      underscored: true,
      paranoid: true
    }
  );

  return AuthorityIssue;
};
