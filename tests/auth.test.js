process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const { sequelize } = require("../src/models");
const { User, Role, UserRole } = require("../src/models");
const bcrypt = require("bcrypt");

const extractTokenFromCookie = (response) => {
  const setCookie = response.headers["set-cookie"] || response.headers["Set-Cookie"] || [];
  if (setCookie.length > 0) {
    const cookieString = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const tokenMatch = cookieString.match(/token=([^;]+)/);
    return tokenMatch ? tokenMatch[1] : null;
  }
  return null;
};

describe("Auth Module", () => {
  let testUser;
  let testRole;
  let authToken;

  beforeAll(async () => {
    await sequelize.authenticate();
    
    testRole = await Role.findOne({ where: { name: "citizen" } });
    if (!testRole) {
      testRole = await Role.create({ name: "citizen" });
    }
  });

  afterAll(async () => {
    if (testUser) {
      await UserRole.destroy({ where: { user_id: testUser.id }, force: true });
      await User.destroy({ where: { id: testUser.id }, force: true });
    }
    await sequelize.close();
  });

  describe("POST /api/auth/register", () => {
    const getValidUserData = (emailSuffix = Date.now()) => ({
      name: "Test User",
      email: `testuser${emailSuffix}@example.com`,
      password: "Test1234!"
    });

    afterEach(async () => {
      if (testUser) {
        await UserRole.destroy({ where: { user_id: testUser.id }, force: true });
        await User.destroy({ where: { id: testUser.id }, force: true });
        testUser = null;
      }
    });

    it("should register a new user successfully (positive)", async () => {
      const validUserData = getValidUserData();
      const res = await request(app)
        .post("/api/auth/register")
        .send(validUserData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Registered successfully.");
      expect(res.body.data.user).toHaveProperty("id");
      expect(res.body.data.user.email).toBe(validUserData.email);
      expect(res.body.data.user.name).toBe(validUserData.name);
      expect(res.body.data.user).not.toHaveProperty("password");

      testUser = await User.findByPk(res.body.data.user.id);
      expect(testUser).toBeTruthy();
    });

    it("should fail with missing name (negative)", async () => {
      const validUserData = getValidUserData();
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          ...validUserData,
          name: ""
        });

      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
    });

    it("should fail with invalid email (negative)", async () => {
      const validUserData = getValidUserData();
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          ...validUserData,
          email: "invalid-email"
        });

      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
    });

    it("should fail with short password (negative)", async () => {
      const validUserData = getValidUserData();
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          ...validUserData,
          password: "Short1!"
        });

      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
    });

    it("should fail with password missing uppercase (negative)", async () => {
      const validUserData = getValidUserData();
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          ...validUserData,
          password: "test1234!"
        });

      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
    });

    it("should fail with password missing number (negative)", async () => {
      const validUserData = getValidUserData();
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          ...validUserData,
          password: "TestPassword!"
        });

      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
    });

    it("should fail with duplicate email (negative)", async () => {
      const validUserData = getValidUserData();
      await request(app)
        .post("/api/auth/register")
        .send(validUserData);

      const res = await request(app)
        .post("/api/auth/register")
        .send(validUserData);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("already registered");
    });

    // Note: confirmPassword validation removed from backend
    // Password confirmation should be handled on frontend
    // Test removed as backend no longer validates confirmPassword
  });

  describe("POST /api/auth/login", () => {
    const testEmail = "logintest@example.com";
    const testPassword = "LoginTest123!";

    beforeAll(async () => {
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      testUser = await User.create({
        name: "Login Test User",
        email: testEmail,
        password_hash: hashedPassword
      });

      await UserRole.create({
        user_id: testUser.id,
        role_id: testRole.id
      });
    });

    afterAll(async () => {
      if (testUser) {
        await UserRole.destroy({ where: { user_id: testUser.id }, force: true });
        await User.destroy({ where: { id: testUser.id }, force: true });
      }
    });

    it("should login successfully with valid credentials (positive)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail,
          password: testPassword,
          role: "citizen"
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Login successful.");
      expect(res.body.data.user).toHaveProperty("id");
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.headers["set-cookie"]).toBeDefined();
      
      const cookie = res.headers["set-cookie"][0];
      expect(cookie).toContain("token=");
      expect(cookie).toContain("HttpOnly");
    });

    it("should fail with incorrect email (negative)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "wrong@example.com",
          password: testPassword,
          role: "citizen"
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Invalid email or password");
    });

    it("should fail with incorrect password (negative)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail,
          password: "WrongPassword123!",
          role: "citizen"
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Invalid email or password");
    });

    it("should fail with invalid email format (negative)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "invalid-email",
          password: testPassword,
          role: "citizen"
        });

      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
    });

    it("should fail with missing password (negative)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail,
          role: "citizen"
        });

      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
    });

    it("should fail with invalid role (negative)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail,
          password: testPassword,
          role: "invalidrole"
        });

      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
    });

    it("should fail when user doesn't have the requested role (negative)", async () => {
      const adminRole = await Role.findOne({ where: { name: "admin" } });
      if (!adminRole) {
        await Role.create({ name: "admin" });
      }

      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail,
          password: testPassword,
          role: "admin"
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("do not have access");
    });
  });

  describe("GET /api/auth/me", () => {
    const testEmail = "metest@example.com";
    const testPassword = "MeTest123!";

    beforeAll(async () => {
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      testUser = await User.create({
        name: "Me Test User",
        email: testEmail,
        password_hash: hashedPassword
      });

      await UserRole.create({
        user_id: testUser.id,
        role_id: testRole.id
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail,
          password: testPassword,
          role: "citizen"
        });

      authToken = extractTokenFromCookie(loginRes);
      if (!authToken) {
        throw new Error("Failed to extract token from login response");
      }
    });

    afterAll(async () => {
      if (testUser) {
        await UserRole.destroy({ where: { user_id: testUser.id }, force: true });
        await User.destroy({ where: { id: testUser.id }, force: true });
      }
    });

    it("should return user data with valid token (positive)", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", `token=${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty("id");
      expect(res.body.data.user.id).toBe(testUser.id.toString());
      expect(res.body.data.user.role).toBe("citizen");
    });

    it("should fail without token (negative)", async () => {
      const res = await request(app)
        .get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Authentication required");
    });

    it("should fail with invalid token (negative)", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", "token=invalid-token-here");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should fail with malformed token (negative)", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", "token=not.a.valid.jwe.token");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/logout", () => {
    const testEmail = "logouttest@example.com";
    const testPassword = "LogoutTest123!";

    beforeAll(async () => {
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      testUser = await User.create({
        name: "Logout Test User",
        email: testEmail,
        password_hash: hashedPassword
      });

      await UserRole.create({
        user_id: testUser.id,
        role_id: testRole.id
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: testEmail,
          password: testPassword,
          role: "citizen"
        });

      authToken = extractTokenFromCookie(loginRes);
      if (!authToken) {
        throw new Error("Failed to extract token from login response");
      }
    });

    afterAll(async () => {
      if (testUser) {
        await UserRole.destroy({ where: { user_id: testUser.id }, force: true });
        await User.destroy({ where: { id: testUser.id }, force: true });
      }
    });

    it("should logout successfully with valid token (positive)", async () => {
      const res = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", `token=${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Logged out successfully.");
      
      const cookie = res.headers["set-cookie"][0];
      expect(cookie).toContain("token=");
      expect(cookie).toContain("Expires=");
    });

    it("should fail without token (negative)", async () => {
      const res = await request(app)
        .post("/api/auth/logout");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Authentication required");
    });

    it("should fail with invalid token (negative)", async () => {
      const res = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", "token=invalid-token");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});

