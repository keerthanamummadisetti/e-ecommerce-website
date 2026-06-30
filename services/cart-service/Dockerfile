# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/src ./src
# Use built-in non-root user 'node'
USER node
EXPOSE 8086
ENV PORT=8086
ENV NODE_ENV=production
CMD ["node", "src/app.js"]
