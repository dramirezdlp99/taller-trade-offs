# =====================================================================
# NeuraHealth — Imagen única con los 3 microservicios gRPC
# Etapa 1 compila TypeScript; etapa 2 solo lleva lo necesario para correr.
# =====================================================================
FROM node:22-slim AS build
WORKDIR /app

# 1) Dependencias primero (aprovecha la caché de Docker)
COPY hospital-service/package*.json hospital-service/
COPY ambulance-service/package*.json ambulance-service/
COPY hospital-dashboard/package*.json hospital-dashboard/
RUN npm ci --prefix hospital-service \
 && npm ci --prefix ambulance-service \
 && npm ci --prefix hospital-dashboard

# 2) Código y contratos; se regeneran los tipos desde los .proto y se compila
COPY . .
RUN npm run build --prefix hospital-service \
 && npm run build --prefix ambulance-service \
 && npm run build --prefix hospital-dashboard \
 && npm prune --omit=dev --prefix hospital-service \
 && npm prune --omit=dev --prefix ambulance-service \
 && npm prune --omit=dev --prefix hospital-dashboard

# ---------------------------------------------------------------------
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    LAUNCH_MODE=single \
    SHIFT_DURATION_SECONDS=600 \
    IDLE_STOP_SECONDS=45

COPY --from=build /app/proto ./proto
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/hospital-service/package.json /app/hospital-service/
COPY --from=build /app/hospital-service/node_modules ./hospital-service/node_modules
COPY --from=build /app/hospital-service/dist ./hospital-service/dist
COPY --from=build /app/ambulance-service/package.json /app/ambulance-service/
COPY --from=build /app/ambulance-service/node_modules ./ambulance-service/node_modules
COPY --from=build /app/ambulance-service/dist ./ambulance-service/dist
COPY --from=build /app/hospital-dashboard/package.json /app/hospital-dashboard/
COPY --from=build /app/hospital-dashboard/node_modules ./hospital-dashboard/node_modules
COPY --from=build /app/hospital-dashboard/dist ./hospital-dashboard/dist
COPY --from=build /app/hospital-dashboard/public ./hospital-dashboard/public

# Solo se publica el puerto web; los puertos gRPC (50051, 50052) son internos
EXPOSE 8080
USER node
CMD ["node", "--max-old-space-size=160", "scripts/launcher.js"]
