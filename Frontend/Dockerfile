# frontend/Dockerfile
FROM node:20-alpine as builder

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci

# Bundle app source
COPY . .



EXPOSE 3000
CMD [ "npm", "start" ]
