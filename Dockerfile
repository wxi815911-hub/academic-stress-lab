FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir -p /app/data && chown node:node /app/data
USER node
ENV PORT=8080 DATA_DIR=/app/data NODE_ENV=production
EXPOSE 8080
CMD ["node","server.mjs"]
