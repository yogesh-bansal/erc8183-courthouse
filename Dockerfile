FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY src/ ./src/
COPY web/ ./web/

EXPOSE 8000

# Serve the interactive web demo on port 8000
CMD ["npx", "serve", "web", "-l", "8000", "--no-clipboard"]
