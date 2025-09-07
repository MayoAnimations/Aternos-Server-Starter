#!/bin/bash

# Aternos Discord Bot Startup Script for Pi Zero 2 W
# This script ensures the bot starts properly with optimizations

echo "Starting Aternos Discord Bot..."

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js not found. Please install Node.js first."
    exit 1
fi

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Set memory limits for Pi Zero 2 W
export NODE_OPTIONS="--max-old-space-size=256"

# Start the bot with logging
echo "Bot starting at $(date)"
node discord-bot.js 2>&1 | tee -a bot.log