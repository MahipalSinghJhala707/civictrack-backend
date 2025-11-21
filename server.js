const app = require("./app");
require("dotenv").config();
const { sequelize } = require("./src/models");

const PORT = process.env.PORT || 8080;

// Validate required environment variables
function validateEnv() {
  const required = ["JWT_SECRET", "DB_NAME", "DB_USER", "DB_PASS", "DB_HOST"];
  const missing = required.filter(key => !process.env[key] || process.env[key].trim() === "");

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:", missing.join(", "));
    console.error("Please check your .env file");
    process.exit(1);
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET.length < 32) {
    console.warn("⚠️  WARNING: JWT_SECRET should be at least 32 characters long for security");
  }

  // Validate JWT_SALT in production
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SALT || process.env.JWT_SALT.trim() === "")) {
    console.error("❌ JWT_SALT is required in production environment");
    console.error("Please set JWT_SALT in your .env file");
    process.exit(1);
  }
}

async function startServer() {
  try {
    // Validate environment variables before starting
    validateEnv();

    await sequelize.authenticate();
    console.log("Database connected");

    // Note: Database schema is managed through migrations
    // Run migrations with: npm run migrate

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Server failed to start:", error.message);
    process.exit(1); 
  }
}


startServer();