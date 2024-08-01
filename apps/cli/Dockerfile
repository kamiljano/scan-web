FROM node:20 AS build

WORKDIR /build

COPY package.json .
COPY tsconfig.json .
COPY package-lock.json .
COPY src src

RUN npm ci
RUN npm run build

FROM node:20-slim AS prod

WORKDIR /app

RUN apt-get update -y
RUN apt-get install -y jq

COPY --from=build /build/package.json .
COPY --from=build /build/package-lock.json .
COPY --from=build /build/dist/ dist/

RUN npm ci --omit=dev
RUN npm link