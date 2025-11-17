const AuthService = require("./auth.service.js");

module.exports = {

  async register(req, res) {
    try {
      const user = await AuthService.register(req.body);
      return res.status(201).json({
        message: "Registered successfully",
        user
      });
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  },

  async login(req, res) {
    try {
      const { user, token } = await AuthService.login(req.body);

      res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax"
      });

      return res.json({
        message: "Login successful",
        user
      });

    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  },

  logout(req, res) {
    res.clearCookie("token");
    return res.json({ message: "Logged out" });
  }

};
