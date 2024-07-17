FROM oven/bun:1 AS base

WORKDIR /app

RUN apt-get update -y
RUN apt-get install -y jq

COPY package.json .
COPY tsconfig.json .
COPY bun.lockb .
COPY src src

RUN bun install
RUN bun link