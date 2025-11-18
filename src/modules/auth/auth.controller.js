const AuthService = require("./auth.service.js");

module.exports = {
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

      res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000
      });

      return res.status(200).json({
        success: true,
        message: "Login successful.",
        data: { user }
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
      return res.status(200).json({
        success: true,
        data: { user: req.user }
      });
    } catch (err) {
      next(err);
    }
  }
};
