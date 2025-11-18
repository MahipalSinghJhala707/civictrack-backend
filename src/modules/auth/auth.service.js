const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, UserRole, Role, sequelize } = require("../../models");

module.exports = {
  async register({ name, email, password }) {
    const t = await sequelize.transaction();

    try {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        const err = new Error("This email is already registered.");
        err.statusCode = 409;
        throw err;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create(
        { name, email, password_hash: hashedPassword },
        { transaction: t }
      );

      const citizenRole = await Role.findOne({ where: { name: "citizen" } });
      if (!citizenRole) {
        const err = new Error("Default role 'citizen' missing in the system.");
        err.statusCode = 500;
        throw err;
      }

      await UserRole.create(
        { user_id: user.id, role_id: citizenRole.id },
        { transaction: t }
      );

      await t.commit();
      return user;

    } catch (err) {
      await t.rollback();
      if (!err.statusCode) err.statusCode = 500;
      throw err;
    }
  },

  async login({ email, password, role }) {
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        const err = new Error("Invalid email or password.");
        err.statusCode = 401;
        throw err;
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        const err = new Error("Invalid email or password.");
        err.statusCode = 401;
        throw err;
      }

      const roleRecord = await Role.findOne({ where: { name: role } });
      if (!roleRecord) {
        const err = new Error("Invalid role selected.");
        err.statusCode = 400;
        throw err;
      }

      const userRole = await UserRole.findOne({
        where: { user_id: user.id, role_id: roleRecord.id }
      });

      if (!userRole) {
        const err = new Error(`You do not have access as ${role}.`);
        err.statusCode = 403;
        throw err;
      }

      const token = jwt.sign(
        { id: user.id, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
      );

      return { user, token };

    } catch (err) {
      if (!err.statusCode) err.statusCode = 500;
      throw err;
    }
  }
};
