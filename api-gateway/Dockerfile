# Production Nginx reverse proxy for Gateway Routing
FROM nginx:1.25-alpine

# Copy local Gateway Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose HTTP port
EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
