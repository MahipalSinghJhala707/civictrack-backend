const AuthService = require("./auth.service.js");

module.exports = {
  async register(req, res, next) {
    try {
      const user = await AuthService.register(req.body);
      return res.status(201).json({
        message: "Registered successfully.",
        user
      });
    } catch (err) {
      next(err); // send to global error middleware
    }
  },

  async login(req, res, next) {
    try {
      const { user, token } = await AuthService.login(req.body);

      res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false, // true in production
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      return res.json({
        message: "Login successful.",
        user
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

      return res.json({ message: "Logged out successfully." });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      return res.json({ user: req.user });
    } catch (err) {
      next(err);
    }
  }
};
