# Use an official Node.js runtime as a parent image
FROM node:18 AS builder

WORKDIR /

# Install dependencies
COPY package*.json ./
RUN npm Install

# Copy Source code
COPY . .

# Build the application
RUN npm run builder

#Stage 2: Development
FROM node:18-alpine

WORKDIR /

#Expose port
EXPOSE 3000

#copy built files from builder
COPY --from=builder /dist ./dist

COPY package*.json ./
RUN npm Install


#Start the application
CMD ["npm", "start"]