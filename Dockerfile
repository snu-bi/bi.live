FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY index.js .
ENV PORT=3000
EXPOSE 3000
CMD ["node", "index.js"]
