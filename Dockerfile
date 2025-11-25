FROM docker.io/node:lts-alpine AS runner

WORKDIR /app

COPY package.json .
COPY . .
RUN npm install

RUN npm run build

CMD [ "npm", "start" ]