# Use an official Node.js runtime as a parent image
FROM node:18 AS builder

WORKDIR /

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy Source code

COPY . .

# Build the application
RUN npm run build

#Stage 2: Development
FROM node:18-alpine

WORKDIR /

#Expose port
EXPOSE 3000

#copy built files from builder
COPY --from=builder /dist ./dist
COPY --from=builder /schema.graphql dist/schema.graphql
COPY --from=builder /db dist/db 

COPY package*.json ./
RUN npm install


#Start the application
CMD ["npm", "start"]