## Create a Vite Docker Container

# Use an official Node runtime as a parent image
FROM node:alpine

# Set the working directory to /app
WORKDIR /app

# Copy the rest of the application code to the container
#COPY package.json .
#COPY .env ./.env

# Install app dependencies
#RUN npm install

# Expose the port that the application listens on
EXPOSE ${CLIENT_PORT}

# Start the application
#CMD ["npm", "run", "dev"]