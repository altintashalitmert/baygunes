# Use Node.js LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files for backend
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/

# Install backend dependencies
WORKDIR /app/backend
RUN npm ci

# Copy backend source code
COPY backend .

# Generate Prisma Client
RUN npx prisma generate

# Build frontend (if serving static files from backend)
# For now, we assume frontend is built separately or served via separate service
# If serving from backend:
# COPY frontend/package*.json ../frontend/
# WORKDIR /app/frontend
# RUN npm ci
# COPY frontend .
# RUN npm run build
# WORKDIR /app/backend
# COPY --from=frontend-build /app/frontend/dist ./public

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
