# backend/Dockerfile
FROM node:20

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Bundle app source
COPY . .

EXPOSE 3000
CMD [ "npm", "start" ]