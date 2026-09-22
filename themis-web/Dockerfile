FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
ARG VITE_API_BASE_URL=http://localhost:3000/api/v1
ARG VITE_AI_BASE_URL=http://localhost:8000
ARG VITE_AI_SERVICE_TOKEN=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_AI_BASE_URL=$VITE_AI_BASE_URL
ENV VITE_AI_SERVICE_TOKEN=$VITE_AI_SERVICE_TOKEN
RUN pnpm build

FROM nginx:1.29-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
