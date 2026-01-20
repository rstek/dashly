# Dockerfile for dashly with JSON config support
FROM oven/bun:latest AS builder

WORKDIR /app
COPY package*.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM caddy:alpine
COPY --from=builder /app/dist /usr/share/caddy/html
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]