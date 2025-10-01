# Use Node.js 18
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Set working directory to backend for the start command
WORKDIR /app/backend

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
