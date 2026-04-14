# Stage 1: Build
FROM node:20-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production
FROM nginx:stable-alpine
# Copy build artifacts from build-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
# Copy custom nginx config from root (will be handled by docker-compose or copied in)
# Note: We expect nginx.conf to be mapped via volume or copied. 
# Since we are building a specific image, let's copy it if it exists, 
# but usually, for flexible config, we map it in compose.
# However, for a standalone image, copying is better.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
