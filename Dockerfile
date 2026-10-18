# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run lint && npm run build

FROM node:24-bookworm-slim AS production
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data MEDIA_DIR=/media
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force && mkdir -p /app/data /media && chown node:node /app/data /media
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js
COPY scripts/backup.mjs ./scripts/backup.mjs
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
