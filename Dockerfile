FROM node:20.9.0-alpine
RUN apk add g++ make py3-pip
WORKDIR /fyp_backend_websocket_app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3010
CMD ["npm", "run", "start"]