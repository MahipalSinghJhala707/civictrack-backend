const bcrypt = require("bcrypt");
const { EncryptJWT } = require("jose");
const crypto = require("crypto");
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

      // Ensure JWT_SECRET is configured
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === "") {
        const err = new Error("JWT secret key is not configured.");
        err.statusCode = 500;
        throw err;
      }

      // Create encrypted token using JWE (JSON Web Encryption)
      // The payload is encrypted with AES-256-GCM, so it CANNOT be decoded without the secret
      // This provides encryption (payload hidden) and integrity protection
      // Derive a 32-byte (256-bit) key from JWT_SECRET using PBKDF2
      // This ensures the key is exactly 32 bytes as required by AES-256-GCM
      const salt = process.env.JWT_SALT || "civictrack-salt";
      const secretKey = crypto.pbkdf2Sync(
        process.env.JWT_SECRET,
        salt,
        100000, // Iterations
        32, // 32 bytes = 256 bits for AES-256
        "sha256"
      );
      
      const token = await new EncryptJWT({ id: user.id, role })
        .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
        .setIssuedAt()
        .setExpirationTime(process.env.JWT_EXPIRES_IN || "2h")
        .encrypt(secretKey);

      return { user, token };

    } catch (err) {
      if (!err.statusCode) err.statusCode = 500;
      throw err;
    }
  },

  async changePassword(userId, { oldPassword, newPassword }) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        const err = new Error("User not found.");
        err.statusCode = 404;
        throw err;
      }

      const match = await bcrypt.compare(oldPassword, user.password_hash);
      if (!match) {
        const err = new Error("Current password is incorrect.");
        err.statusCode = 401;
        throw err;
      }

      if (oldPassword === newPassword) {
        const err = new Error("New password must be different from current password.");
        err.statusCode = 400;
        throw err;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ password_hash: hashedPassword });

      return user;
    } catch (err) {
      if (!err.statusCode) err.statusCode = 500;
      throw err;
    }
  }
};
