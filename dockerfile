# Use lightweight Node.js image
FROM node:18-alpine

WORKDIR /app

# 🚨 ADDED mysql2 HERE!
RUN npm init -y && npm install express multer @aws-sdk/client-s3 mysql2

COPY app.js .

EXPOSE 80

CMD ["node", "app.js"]