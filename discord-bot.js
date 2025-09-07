// Load environment variables from .env file if it exists
require('dotenv').config();

const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const express = require("express");
const fs = require("fs");
const path = require("path");
const AternosService = require('./aternos-automation');

// Simple logger
const logger = {
    info: (msg, data) => console.log(`[${new Date().toISOString()}] [INFO] ${msg}`, data || ''),
    error: (msg, data) => console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`, data || ''),
    warn: (msg, data) => console.warn(`[${new Date().toISOString()}] [WARN] ${msg}`, data || ''),
    debug: (msg, data) => console.log(`[${new Date().toISOString()}] [DEBUG] ${msg}`, data || '')
};

// Auto-detect Chrome/Chromium path
function getChromiumPath() {
    const possiblePaths = [
        '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium', 
        '/usr/bin/google-chrome',
        '/opt/google/chrome/google-chrome'
    ];
    
    for (const path of possiblePaths) {
        if (fs.existsSync(path)) return path;
    }
    return undefined; // Let Puppeteer auto-detect
}

// Configuration optimized for Pi Zero 2 W
const config = {
    DISCORD_TOKEN: process.env.DISCORD_BOT_TOKEN,
    CLIENT_ID: process.env.DISCORD_BOT_TOKEN ? Buffer.from(process.env.DISCORD_BOT_TOKEN.split('.')[0], 'base64').toString() : null,
    ATERNOS_USERNAME: process.env.ATERNOS_USERNAME,
    ATERNOS_PASSWORD: process.env.ATERNOS_PASSWORD,
    SERVER_NAME: process.env.SERVER_NAME || 'default',
    PUPPETEER_CONFIG: {
        headless: "new",
        executablePath: getChromiumPath(),
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox", 
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
            "--disable-web-security",
            "--disable-features=VizDisplayCompositor,AudioContext",
            "--disable-extensions",
            "--disable-default-apps",
            "--disable-sync",
            "--disable-translate",
            "--disable-plugins",
            "--disable-plugins-discovery",
            "--disable-preconnect",
            "--disable-gpu-sandbox",
            "--disable-software-rasterizer",
            "--memory-pressure-off",
            "--disable-background-networking",
            "--disable-background-timer-throttling",
            "--disable-renderer-backgrounding",
            "--disable-backgrounding-occluded-windows",
            "--disable-features=TranslateUI",
            "--disable-ipc-flooding-protection",
            "--max_old_space_size=256"
        ],
        defaultViewport: { width: 800, height: 600 }, // Smaller viewport for less memory
        timeout: 15000 // Reduced timeout
    },
    TIMEOUT_NAVIGATION: 15000, // Reduced for Pi Zero 2 W
    TIMEOUT_ELEMENT: 3000,     // Reduced for faster response
    DELAY_BETWEEN_ACTIONS: 500, // Reduced delay for better performance
};

// Lightweight web server for health checks
const app = express();
app.get("/", (req, res) => res.send("Aternos Discord Bot is running!"));
app.get("/health", (req, res) => res.json({ status: "healthy", uptime: process.uptime() }));
app.listen(3000, () => logger.info("Health check server running on port 3000"));

// Discord client
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.commands = new Map();

// Start command
const startCommand = {
    data: new SlashCommandBuilder()
        .setName('start')
        .setDescription('Start the Aternos Minecraft server'),

    async execute(interaction) {
        logger.info(`Start command executed by ${interaction.user.username}`);
        await interaction.deferReply();
        
        let currentProgress = 0;
        
        const getStatusEmoji = (progress) => {
            if (progress === 100) return '✅';
            if (progress < 0) return '❌';
            return '🔄';
        };

        const updateEmbed = async (title, description, status) => {
            const embed = new EmbedBuilder()
                .setColor(status === 'Success' ? 0x00ff00 : status === 'Error' ? 0xff0000 : 0x1e90ff)
                .setTitle(`${getStatusEmoji(status === 'Success' ? 100 : status === 'Error' ? -1 : 50)} ${title}`)
                .setDescription(description)
                .setTimestamp()
                .setFooter({ text: 'Aternos Bot' });

            try {
                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                logger.debug('Failed to update Discord embed:', error.message);
            }
        };

        await updateEmbed('Starting Server', 'Initializing automation...', 'Working');

        const aternosService = new AternosService(config, logger);

        try {
            // The startServer method handles the entire automation process
            const result = await aternosService.startServer(async (step) => {
                switch(step) {
                    case 'login':
                        await updateEmbed('Logging In', 'Accessing Aternos account...', 'Working');
                        break;
                    case 'finding':
                        await updateEmbed('Finding Server', `Looking for ${config.SERVER_NAME} server...`, 'Working');
                        break;
                    case 'starting':
                        await updateEmbed('Starting Server', 'Initiating server startup...', 'Working');
                        break;
                }
            });
            
            if (result.success) {
                if (result.alreadyRunning) {
                    await updateEmbed('Server Already Running', 'Your Minecraft server is already online!', 'Success');
                } else {
                    await updateEmbed('Server Started', 'Your Minecraft server is starting up!', 'Success');
                }
            } else {
                await updateEmbed('Start Failed', result.error || 'Unknown error occurred', 'Error');
            }
            
            await aternosService.cleanup();
            
        } catch (error) {
            logger.error('Error during server start:', error);
            await updateEmbed('❌ Server Start Failed', `An error occurred: ${error.message}`, 'Error', 0);
            await aternosService.cleanup();
        }
    }
};

client.commands.set(startCommand.data.name, startCommand);

// Register commands
async function registerCommands() {
    try {
        const rest = new REST({ version: "9" }).setToken(config.DISCORD_TOKEN);
        logger.info("Started refreshing application (/) commands.");
        await rest.put(Routes.applicationCommands(config.CLIENT_ID), {
            body: [startCommand.data.toJSON()],
        });
        logger.info("Successfully reloaded application (/) commands.");
    } catch (error) {
        logger.error("Error registering commands:", error);
    }
}

// Bot events
client.once("ready", async () => {
    logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
    await registerCommands();
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        logger.warn(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error("Error executing command:", error);
        const errorMessage = "There was an error while executing this command!";
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

// Error handling
client.on("error", (error) => logger.error("Discord client error:", error));
process.on("unhandledRejection", (error) => logger.error("Unhandled promise rejection:", error));
process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception:", error);
    process.exit(1);
});

// Start bot
client.login(config.DISCORD_TOKEN);