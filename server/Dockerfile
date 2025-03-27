FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Expose port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production

# Start the app
CMD ["node", "src/index.js"]
