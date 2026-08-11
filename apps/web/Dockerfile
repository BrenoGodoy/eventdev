FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/web/package*.json apps/web/

RUN npm ci

COPY apps/web apps/web

EXPOSE 3000

CMD ["npm", "run", "dev", "--workspace=web", "--", "--hostname", "0.0.0.0", "--port", "3000"]
