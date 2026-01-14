FROM node:lts-alpine

WORKDIR /app

# Copy root package.json and install backend dependencies
COPY package*.json ./
RUN npm install

# Copy frontend package.json and install frontend dependencies
COPY frontend/package*.json frontend/
RUN npm install --prefix frontend

# Copy backend source code
COPY backend/ backend/

# Copy frontend source code and build
COPY frontend/ frontend/
RUN npm run build --prefix frontend

EXPOSE 5000

ENV NODE_ENV=production

CMD ["npm", "start"]
