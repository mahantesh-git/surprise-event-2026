FROM node:20-bullseye

# Install python, pip, and link python to python3
RUN apt-get update && \
    apt-get install -y python3 python3-pip python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

# Install python dependencies for QR code generation
# Add --break-system-packages to bypass PEP 668 in Debian 12/Bullseye if needed, 
# but bullseye usually allows it. Let's use it just in case, or use a venv.
RUN pip3 install qrcode pillow

# We set the working directory to match the relative paths expected by the app.
# The app looks for ../../event_qr_codes from backend/dist/index.js
# So if we are in /app/backend, ../../event_qr_codes is /app/event_qr_codes
WORKDIR /app/backend

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy backend source code
COPY . .

# Create the QR codes directory the backend expects
RUN mkdir -p /app/event_qr_codes

# Build TypeScript
RUN npm run build

EXPOSE 4000

# Start the application
CMD ["npm", "start"]
