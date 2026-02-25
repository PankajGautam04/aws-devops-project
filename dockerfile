# Use lightweight Node.js image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Initialize npm and install Express (the server engine)
RUN npm init -y && npm install express

# Copy the app code
COPY app.js .

# Open the web port
EXPOSE 80

# Start the application
CMD ["node", "app.js"]
