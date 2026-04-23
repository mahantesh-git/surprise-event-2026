FROM node:20-bullseye

# Install python, pip, and link python to python3
RUN apt-get update && \
    apt-get install -y python3 python3-pip python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

# Install python dependencies for QR code generation
RUN pip3 install qrcode pillow

# Set working dir to /app so relative paths work correctly
WORKDIR /app

# Copy the entire repo (backend + event_qr_codes)
COPY . .

# Install backend dependencies
WORKDIR /app/backend

RUN npm install

# Build TypeScript
RUN npm run build

# Create the QR codes directory the backend expects
RUN mkdir -p /app/event_qr_codes
 
EXPOSE 4000

# Start the application
CMD ["npm", "start"]
