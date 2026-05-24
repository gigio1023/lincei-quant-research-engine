# Build stage
FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN mkdir -p dist/src/templates && cp -r src/templates/* dist/src/templates/

# Production stage
FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3001
CMD ["node", "dist/src/main.js"]
