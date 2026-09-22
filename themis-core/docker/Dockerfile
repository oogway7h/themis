FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src
RUN pnpm prisma:generate
RUN pnpm build
RUN pnpm prune --prod

FROM node:22-alpine AS runtime
RUN corepack enable && addgroup -S themis && adduser -S themis -G themis
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=themis:themis /app/node_modules ./node_modules
COPY --from=build --chown=themis:themis /app/dist ./dist
COPY --from=build --chown=themis:themis /app/prisma ./prisma
COPY --chown=themis:themis package.json ./
USER themis
EXPOSE 3000
CMD ["node", "dist/main.js"]
