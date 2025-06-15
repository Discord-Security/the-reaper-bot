FROM docker.io/node:21.5 AS runner

WORKDIR /app

COPY package.json .
COPY . .
RUN npm install

RUN npm run build

CMD [ "npm", "start" ]