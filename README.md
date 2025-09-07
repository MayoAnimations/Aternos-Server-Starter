# Discord Aternos Bot

A Discord bot that automatically starts your Aternos Minecraft server using web automation. Optimized for resource-constrained environments like Raspberry Pi Zero 2 W.

## Features

- 🚀 **Automated Server Starting**: Uses `/start` command to automatically log into Aternos and start your server
- 📱 **Clean Interface**: Minimal status updates that don't make the bot appear to hang
- 💾 **Low Memory Optimized**: Configured for Pi Zero 2 W with only 512MB RAM
- 🔧 **Smart Automation**: Handles anti-bot detection and various Aternos page layouts
- ⚡ **Fast Response**: Optimized delays and timeouts for quick execution
- 🎯 **Configurable**: Set your server name in environment variables - no code changes needed

## Quick Start

1. **Clone or download** this repository to your Pi Zero 2 W
2. **Follow setup instructions** in `pi-setup-instructions.md`
3. **Configure** your credentials in `.env` file
4. **Run** with `./start-bot.sh` or use PM2 for production

## Files Overview

- **`discord-bot.js`** - Main bot application with Discord slash commands
- **`aternos-automation.js`** - Web automation service for Aternos interactions
- **`package.json`** - Dependencies and project configuration
- **`.env.example`** - Template for environment variables
- **`start-bot.sh`** - Startup script with Pi Zero 2 W optimizations
- **`pi-setup-instructions.md`** - Complete setup guide for Raspberry Pi

## Memory Optimizations

This bot is specifically optimized for the Pi Zero 2 W:

- Browser memory limited to 256MB
- Smaller viewport size (800x600)
- Reduced animation delays
- Disabled unnecessary browser features
- Aggressive Chrome flags for low-memory usage

## Commands

- `/start` - Automatically start your Aternos Minecraft server

## Requirements

- Node.js 18+
- Chromium browser
- Discord bot token
- Aternos account credentials

## Support

See `pi-setup-instructions.md` for detailed setup instructions, troubleshooting, and performance tips.

## License

This project is for educational purposes. Make sure to follow Discord's Terms of Service and Aternos' Terms of Service when using this bot.