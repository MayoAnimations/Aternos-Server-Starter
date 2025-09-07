# Discord Aternos Bot

## Overview

This is a Discord bot that automates Minecraft server management through Aternos. The bot uses web automation to interact with the Aternos platform and provides Discord slash commands for server control. It's designed to run on resource-constrained environments like Raspberry Pi Zero 2 W, with optimized Puppeteer configurations for low-memory operation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Bot Architecture
The application follows a modular architecture with clear separation of concerns:

- **Discord Bot Layer** (`discord-bot.js`) - Handles Discord API interactions, slash commands, and user interface
- **Aternos Service Layer** (`aternos-automation.js`) - Manages web automation for Aternos platform interactions
- **Configuration Layer** - Environment-based configuration with auto-detection capabilities

### Web Automation Strategy
Uses Puppeteer for browser automation with anti-detection measures:
- Custom user agent spoofing to appear as regular Chrome browser
- Adblocker detection bypass through DOM manipulation
- Optimized viewport settings for resource-constrained environments
- Headless browser operation with memory optimizations

### Resource Optimization
Specifically configured for low-resource environments:
- Chrome/Chromium path auto-detection across different Linux distributions
- Memory-optimized Puppeteer launch arguments
- Minimal browser feature loading to reduce RAM usage
- Smaller viewport dimensions (800x600) for Pi Zero 2 W compatibility

### Error Handling and Logging
Simple structured logging system with:
- Timestamp-based log formatting
- Multiple log levels (info, error, warn, debug)
- Console-based output for easy monitoring

### Authentication Flow
Environment variable-based authentication:
- Discord bot token for API access
- Aternos credentials for web automation
- Client ID extraction from Discord token for slash command registration

## External Dependencies

### Core Dependencies
- **discord.js** - Discord API library for bot functionality
- **puppeteer** - Headless Chrome automation for Aternos interaction
- **express** - HTTP server framework (likely for health checks or webhooks)
- **dotenv** - Environment variable management

### System Dependencies
- **Chrome/Chromium Browser** - Required for Puppeteer automation with auto-detection across multiple installation paths
- **Node.js Runtime** - JavaScript execution environment

### External Services
- **Discord API** - Bot hosting and slash command functionality
- **Aternos Platform** - Target service for Minecraft server management automation

### Development Tools
- **@discordjs/rest** and **discord-api-types** - Enhanced Discord API interaction and TypeScript definitions