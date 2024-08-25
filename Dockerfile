FROM node:20-alpine

RUN apk update
RUN apk add
RUN apk add ffmpeg

WORKDIR /app

COPY package*.json ./
RUN yarn install

COPY . .

RUN cd /app

CMD ["yarn", "start"]