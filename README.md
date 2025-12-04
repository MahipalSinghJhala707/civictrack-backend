**CivicTrack-Backend**

## Docker

1. Copy `.env.sample` to `.env` and fill in values. Set `DB_HOST` to your RDS endpoint and `DB_PORT` to your RDS port (default: 5432).

2. Build the Docker image:

   ```bash
   docker build -t civictrack-backend .
   ```

3. Run the container:

   ```bash
   docker run -d --name civictrack-backend --env-file .env -p 4000:4000 civictrack-backend
   ```

   The API becomes available on `http://localhost:4000` (or the port specified in your `.env` file).

4. Run database migrations or seed scripts inside the running container:

   ```bash
   docker exec civictrack-backend npm run migrate
   docker exec civictrack-backend npm run seed
   ```

5. Stop and remove the container:

   ```bash
   docker stop civictrack-backend
   docker rm civictrack-backend
   ```

**Note:** This project uses Amazon RDS for the database. Make sure your RDS instance is accessible and your `.env` file contains the correct RDS connection details.