FROM oven/bun:1.3 AS runner

WORKDIR /app

COPY package.json .
COPY . .
RUN bun install

RUN bun run build

CMD [ "bun", "start" ]