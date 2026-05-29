# Use Debian-based image — has OpenSSL built in, no Alpine issues
FROM node:18-bullseye-slim

WORKDIR /app

# Install curl for healthcheck + openssl (already present but explicit)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma client at build time
RUN npx prisma generate

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["/bin/sh", "/app/entrypoint.sh"]
