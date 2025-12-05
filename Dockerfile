FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

ENV NODE_ENV=production

# PORT should be provided via environment variable at runtime
# EXPOSE is set dynamically based on PORT env var

CMD ["node", "server.js"]

