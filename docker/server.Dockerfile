# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY server/ .
RUN npm run build

# Run stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
EXPOSE 3001
CMD ["node", "dist/server.js"]
