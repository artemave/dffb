FROM node:23.7

WORKDIR /app

# Copy the rest of the application
COPY . /app

RUN npm ci

# Define the command to run the worker script
CMD ["node", "bot.js"]
