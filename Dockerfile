FROM node:20

RUN apt-get update && apt-get install -y cron

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

COPY crontab /etc/cron.d/my-cron-job

RUN chmod 0644 /etc/cron.d/my-cron-job
RUN crontab /etc/cron.d/my-cron-job
RUN touch /var/log/cron.log

CMD cron && tail -f /var/log/cron.log
