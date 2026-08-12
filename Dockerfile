# syntax=docker/dockerfile:1

FROM node:22-alpine AS client-build
WORKDIR /app/client

COPY client/package.json ./
RUN npm install
COPY client ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV API_PORT=4000

COPY server/package.json ./server/
RUN cd server && npm install
COPY prisma ./prisma
RUN cd server && npx prisma generate --schema=/app/prisma/schema.prisma && npm prune --omit=dev
COPY server/src ./server/src
COPY --from=client-build /app/client/dist ./client/dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node --input-type=module -e "import { isHealthyResponse } from './server/src/healthProbe.js'; fetch('http://127.0.0.1:3000/api/health').then(async r => process.exit(isHealthyResponse(r.status, await r.json()) ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/src/production.js"]
