# Use an official Node.js runtime as the base image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install the application dependencies
RUN npm ci

# Copy the rest of the application code to the working directory
COPY . .

# Expose the application port (change 3000 to your application's port if different)
EXPOSE 3000

# Define the command to run your application
CMD ["npm", "start"]