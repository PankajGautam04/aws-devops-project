# Use lightweight Node.js image
FROM node:18-alpine

WORKDIR /app

# Add the new AWS and Multer dependencies
RUN npm init -y && npm install express multer @aws-sdk/client-s3

COPY app.js .

EXPOSE 80

CMD ["node", "app.js"]