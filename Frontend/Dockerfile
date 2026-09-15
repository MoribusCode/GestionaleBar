# frontend/Dockerfile
FROM node:20-alpine AS builder

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci

# Bundle app source
COPY . .
RUN npm run build


# Immagine finale: nginx serve i file statici già buildati e fa da reverse proxy
# verso il backend per /api (incluso il websocket di Socket.IO)
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
