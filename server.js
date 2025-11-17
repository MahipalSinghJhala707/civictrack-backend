const app = require("./app");
require("dotenv").config();
const { sequelize } = require("./src/models");

const PORT = process.env.PORT || 8080;


async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Database connected");

    await sequelize.sync({ alter: true });
    console.log("Models synced");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Server failed to start:", error.message);
    process.exit(1); 
  }
}


startServer();