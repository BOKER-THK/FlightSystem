FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm install express
RUN npm install ckan
EXPOSE 8080
CMD ["node", "server.js"]