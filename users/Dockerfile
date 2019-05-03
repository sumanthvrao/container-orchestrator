FROM alpine:3.7
WORKDIR /app

RUN apk add nodejs-current
RUN apk add nodejs-current-npm
RUN npm install

COPY . /app
EXPOSE 4000
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.2.1/wait /wait
RUN chmod +x /wait

ENV TEAM_ID CC_368_378_402_403

## Launch the wait tool and then your application
CMD /wait && node server.js

