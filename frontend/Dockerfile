FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

RUN npm run build

FROM alpine:latest

RUN apk --no-cache add nodejs npm

RUN npm i -g serve

WORKDIR /root

COPY --from=builder /app/dist .

ENTRYPOINT [ "serve", "-l", "6001"]
