const express = require("express");
const router = express.Router();

const authMiddleware = require("../auth/auth.middleware.js");
const { allowRoles } = require("../auth/auth.roles.js");

const userRoutes = require("./user/user.route.js");
const departmentRoutes = require("./department/department.route.js");
const authorityRoutes = require("./authority/authority.route.js");
const authorityUserRoutes = require("./authorityUser/authorityUser.route.js");
const issueCategoryRoutes = require("./issueCategory/issueCategory.route.js");

// Apply authentication and admin-only access to all admin routes
router.use(authMiddleware);
router.use(allowRoles("admin"));

router.use("/users", userRoutes);
router.use("/departments", departmentRoutes);
router.use("/authorities", authorityRoutes);
router.use("/authority-users", authorityUserRoutes);
router.use("/issue-categories", issueCategoryRoutes);

module.exports = router;

