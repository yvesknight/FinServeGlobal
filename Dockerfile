# Build stage
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/server.ts ./
COPY --from=build /app/firebase-applet-config.json ./
# We need firebase-admin and other runtime deps
RUN npm install --only=production

EXPOSE 3000

CMD ["npm", "start"]
