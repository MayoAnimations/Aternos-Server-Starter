# Discord Aternos Bot - Pi Zero 2 W Setup Instructions

## Prerequisites

### 1. Pi Zero 2 W Setup
- Raspberry Pi OS Lite (64-bit) installed
- Internet connection configured
- SSH enabled (if accessing remotely)

### 2. Required System Packages
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 (optimized for Pi Zero 2 W)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Chromium for Puppeteer
sudo apt install -y chromium-browser

# Verify installations
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

## Bot Installation

### 1. Download Bot Files
```bash
# Create bot directory
mkdir ~/aternos-discord-bot
cd ~/aternos-discord-bot

# Download files from your GitHub repo
# Replace 'yourusername' with your actual GitHub username
git clone https://github.com/yourusername/aternos-discord-bot.git .

# Or manually copy the files:
# - discord-bot.js
# - aternos-automation.js
# - package.json
# - .env.example
```

### 2. Install Dependencies
```bash
# Install npm packages
npm install

# This will install:
# - discord.js (Discord API)
# - puppeteer (Web automation)
# - express (Health check server)
# - dotenv (Environment variables)
```

### 3. Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit configuration with your credentials
nano .env
```

Add your credentials to the `.env` file:
```env
DISCORD_BOT_TOKEN=your_discord_bot_token_here
ATERNOS_USERNAME=your_aternos_username
ATERNOS_PASSWORD=your_aternos_password
SERVER_NAME=your_server_name_here
```

**Note**: Replace `your_server_name_here` with the exact name of your Minecraft server as it appears on Aternos.

### 4. Discord Bot Setup
1. Go to https://discord.com/developers/applications
2. Create New Application
3. Go to "Bot" section
4. Create a bot and copy the token
5. Under "Privileged Gateway Intents", enable:
   - Server Members Intent
   - Message Content Intent
6. Generate invite link with these permissions:
   - Send Messages
   - Use Slash Commands
   - Embed Links

## Running the Bot

### Manual Start
```bash
cd ~/aternos-discord-bot
node discord-bot.js
```

### Auto-Start with PM2 (Recommended)
```bash
# Install PM2 process manager
sudo npm install -g pm2

# Start bot with PM2
cd ~/aternos-discord-bot
pm2 start discord-bot.js --name "aternos-bot"

# Save PM2 configuration
pm2 save

# Enable PM2 startup on boot
pm2 startup
# Follow the command it shows you

# Monitor the bot
pm2 status
pm2 logs aternos-bot
```

## Memory Optimization for Pi Zero 2 W

The bot is already optimized for low-memory environments:

- **Browser Memory Limit**: 256MB maximum
- **Smaller Viewport**: 800x600 instead of 1366x768
- **Reduced Delays**: Faster response times
- **Minimal Browser Features**: Disabled unnecessary components

### Additional Pi Optimizations
```bash
# Increase swap space if needed
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Change CONF_SWAPSIZE=512 (or 1024 if you have issues)
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Limit memory usage
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

## Troubleshooting

### Common Issues
1. **"Browser launch failed"**
   - Install chromium: `sudo apt install chromium-browser`
   - Check paths in the auto-detection code

2. **"Out of memory" errors**
   - Increase swap space (see above)
   - Close other applications
   - Restart the Pi

3. **"Login failed" errors**
   - Check Aternos credentials
   - Wait 60 minutes if CAPTCHA appears
   - Verify internet connection

### Monitoring
```bash
# Check bot status
pm2 status

# View logs
pm2 logs aternos-bot --lines 50

# Restart if needed
pm2 restart aternos-bot

# Check system resources
htop
free -h
```

## Usage

1. Invite the bot to your Discord server
2. Use `/start` command to start your Aternos server
3. The bot will show a progress bar and handle everything automatically
4. Monitor logs for any issues

## Performance Tips

- Run only the bot on your Pi Zero 2 W for best performance
- Use SSH instead of desktop environment to save memory
- Close unnecessary services:
  ```bash
  sudo systemctl disable bluetooth
  sudo systemctl disable cups (if you don't need printing)
  ```

## Security Notes

- Keep your `.env` file secure and never commit it to Git
- Use strong passwords for your Aternos account
- Consider using a dedicated Aternos account for the bot
- Regularly update your Pi system and bot dependencies