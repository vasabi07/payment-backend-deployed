# Stage 1: Build the application
FROM node:18-bullseye-slim AS builder

# Set the working directory
WORKDIR /app

# Copy the root-level package.json and yarn.lock
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the entire project
COPY . .

# Install packages and generate Prisma client
RUN yarn install && yarn prisma generate

# Stage 2: Create a smaller image for production
FROM node:18-bullseye-slim

# Set the working directory
WORKDIR /app

# Copy the built application and dependencies from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Also copy the Prisma client
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma

# Copy the .env file to the container
COPY .env .env

# Install production dependencies
RUN yarn install --production --frozen-lockfile

# Expose the application port
EXPOSE 8000

# Command to run the application
CMD ["node", "dist/index.js"]
