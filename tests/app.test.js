process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");

describe("GET /", () => {
  it("should return API running message", async () => {
    const res = await request(app).get("/");
    
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("API is running...");
  });
});
