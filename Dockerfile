FROM node:20-slim
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
COPY /src/index.js /usr/src/app
EXPOSE 3000
CMD [ "node", "index.js" ]

