# Stage 1: Build frontend (Vite) + backend
FROM node:20 AS builder

WORKDIR /app

# Copy everything
COPY . .

# Install all dependencies (frontend + backend)
RUN npm install

# Build frontend: vite builds from client to dist/public
RUN npm run build

# Stage 2: Prepare production container
FROM node:20

WORKDIR /app

# Copy only runtime files
COPY package*.json ./
RUN npm install --omit=dev

# Copy built app and source
COPY --from=builder /app .

# Expose the app port
EXPOSE 5000

ENV NODE_ENV=production
# Run backend (index.js should serve dist/public)
CMD ["node", "dist/index.js"]
