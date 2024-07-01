FROM node:20-alpine3.19 as build

WORKDIR /app

COPY package.json .
COPY tsconfig.json .
COPY src src

RUN yarn install
RUN yarn build

FROM node:20-alpine3.19 as production

WORKDIR /app

COPY --from=build /app/dist /app/dist
COPY package.json .

