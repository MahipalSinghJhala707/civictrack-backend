const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {  User, UserRole, Role, sequelize} = require("../../models");

module.exports = {
 
  async register({ name, email, password }) {
    if (!name || !email || !password) {
      const err = new Error("Name, email and password are required.");
      err.statusCode = 400;
      throw err;
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      const err = new Error("This email is already registered.");
      err.statusCode = 409;
      throw err;
    }

    const t = await sequelize.transaction();
    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create(
        { name, email, password_hash: hashedPassword },
        { transaction: t }
      );

      // default role citizen
      const citizenRole = await Role.findOne({ where: { name: "citizen" } });
      if (!citizenRole) {
        const err = new Error("Default role missing in the system.");
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
      if (err.statusCode) throw err;
      const wrap = new Error(err.message || "Registration failed.");
      wrap.statusCode = err.statusCode || 500;
      throw wrap;
    }
  },


  async login({ email, password, role }) {
    if (!email || !password || !role) {
      const err = new Error("Email, password and role are required.");
      err.statusCode = 400;
      throw err;
    }

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
      if (err.statusCode) throw err;
      const wrap = new Error(err.message || "Login failed.");
      wrap.statusCode = 500;
      throw wrap;
    }
  }
};
