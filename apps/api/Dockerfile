FROM node:22-alpine AS build
WORKDIR /app
COPY tsconfig.base.json tsconfig.base.json
COPY apps/api/package.json apps/api/package-lock.json apps/api/
RUN npm ci --prefix apps/api
COPY apps/api apps/api
RUN npm --prefix apps/api run build
RUN npm prune --omit=dev --prefix apps/api

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY apps/api/package.json ./apps/api/package.json
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
