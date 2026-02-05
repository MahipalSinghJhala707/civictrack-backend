const AuthService = require("./auth.service.js");

module.exports = {
  async listCities(req, res, next) {
    try {
      const cities = await AuthService.listCities();
      return res.status(200).json({
        success: true,
        data: { cities }
      });
    } catch (err) {
      next(err);
    }
  },

  async register(req, res, next) {
    try {
      const user = await AuthService.register(req.body);

      return res.status(201).json({
        success: true,
        message: "Registered successfully.",
        data: { user }
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { user, token } = await AuthService.login(req.body);

      const isProduction = process.env.NODE_ENV === "production";

      res.cookie("token", token, {
        httpOnly: true,
        // In production we need SameSite=None + Secure for cross-site cookies.
        // In local development, browsers will reject SameSite=None without Secure,
        // so we fall back to Lax to make sure the cookie is accepted.
        sameSite: isProduction ? "None" : "Lax",
        secure: isProduction,
        maxAge: 24 * 60 * 60 * 1000
      });

      return res.status(200).json({
        success: true,
        message: "Login successful.",
        data: { 
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: req.body.role, // Include the active role that was used for login
            city_id: user.city_id
          }
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      res.cookie("token", "", {
        httpOnly: true,
        sameSite: "lax",
        expires: new Date(0)
      });

      return res.status(200).json({
        success: true,
        message: "Logged out successfully."
      });

    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      // Fetch full user details including roles
      const { User, Role, City } = require("../../models");
      const user = await User.findByPk(req.user.id, {
        attributes: ["id", "name", "email", "city_id"],
        include: [
          {
            model: Role,
            as: "roles",
            attributes: ["id", "name"],
            through: { attributes: [] }
          },
          {
            model: City,
            as: "city",
            attributes: ["id", "name"]
          }
        ]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      return res.status(200).json({
        success: true,
        data: { 
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: req.user.role, // Current active role from token
            roles: user.roles,
            city_id: user.city_id,
            city: user.city
          }
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req, res, next) {
    try {
      const user = await AuthService.changePassword(req.user.id, req.body);

      return res.status(200).json({
        success: true,
        message: "Password changed successfully."
      });
    } catch (err) {
      next(err);
    }
  }
};
