FROM node:18-alpine

WORKDIR /app

# Copiar los paquetes principales de la raíz
COPY package*.json ./

# Copiar la carpeta del contrato gRPC (SSOT)
COPY proto ./proto

# Copiar y preparar el microservicio del dashboard
WORKDIR /app/hospital-dashboard
COPY hospital-dashboard/package*.json ./
RUN npm install
COPY hospital-dashboard/ ./
RUN npx tsc

# Exponer el puerto estándar que Render asigna mediante la variable PORT
EXPOSE 3000

ENV PORT=3000

# Ejecutar el servidor compilado
CMD ["node", "dist/Server.js"]