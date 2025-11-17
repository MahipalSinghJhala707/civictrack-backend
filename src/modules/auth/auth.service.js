const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, UserRole, Role } = require("../../models");

module.exports = {

  async register({ name, email, password }) {
    if (!name || !email || !password) throw new Error("Missing fields");

    const exists = await User.findOne({ where: { email } });
    if (exists) throw new Error("Email already exists");

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password_hash: hashed
    });

    const role = await Role.findOne({ where: { name: "citizen" } });
    if (role) {
      await UserRole.create({
        user_id: user.id,
        role_id: role.id
      });
    }

    return user;
  },

  async login({ email, password }) {
    if (!email || !password) throw new Error("Missing credentials");

    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error("Invalid credentials");

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) throw new Error("Invalid credentials");

    const userRoles = await UserRole.findAll({
      where: { user_id: user.id },
      include: [{ model: Role }]
    });

    const roleNames = userRoles.map(r => r.Role.name);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roles: roleNames
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return { user, token };
  }

};
