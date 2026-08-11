FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/web/package*.json apps/web/

RUN npm ci

COPY apps/api apps/api

EXPOSE 3001

CMD ["npm", "run", "start:dev", "--workspace=api"]
