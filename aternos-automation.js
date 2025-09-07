const puppeteer = require("puppeteer");
class AternosService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.browser = null;
        this.page = null;
        this.isLoggedIn = false;
    }

    async initializeBrowser() {
        try {
            this.logger.info("Initializing Puppeteer browser...");
            this.browser = await puppeteer.launch(this.config.PUPPETEER_CONFIG);
            this.logger.info("Browser launched successfully");
            return true;
        } catch (error) {
            this.logger.error("Failed to initialize browser:", error);
            return false;
        }
    }

    async createPage() {
        try {
            if (!this.browser) {
                const initialized = await this.initializeBrowser();
                if (!initialized) return false;
            }

            this.page = await this.browser.newPage();

            // Anti-detection setup
            await this.page.setUserAgent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            );

            await this.page.setViewport({ width: 800, height: 600 }); // Smaller for Pi Zero 2 W

            // Bypass adblocker detection
            await this.page.evaluateOnNewDocument(() => {
                delete navigator.__proto__.webdriver;
                window.adsbygoogle = window.adsbygoogle || [];
                window.googletag = window.googletag || {};
                window.googletag.cmd = window.googletag.cmd || [];
                window.canRunAds = true;
                window.adBlockEnabled = false;
            });

            return true;
        } catch (error) {
            this.logger.error("Failed to create page:", error);
            return false;
        }
    }

    async navigateToAternos() {
        try {
            this.logger.info("Navigating to Aternos...");
            
            // Method 1: Direct navigation to /go/ (fastest)
            this.logger.debug('Navigation Method 1: Direct to /go/');
            try {
                await this.page.goto("https://aternos.org/go/", {
                    waitUntil: "domcontentloaded",
                    timeout: 8000,
                });
                await this.takeDebugScreenshot("01-aternos-loaded");
                this.logger.info('✓ Navigation Method 1 worked: Direct /go/');
            } catch (error) {
                // Method 2: Main page navigation
                this.logger.debug('Navigation Method 2: Main page first');
                await this.page.goto("https://aternos.org/", {
                    waitUntil: "domcontentloaded",
                    timeout: 8000,
                });
                await this.takeDebugScreenshot("01-aternos-main-redirect");
                this.logger.info('✓ Navigation Method 2 worked: Main page');
            }

            // Quick adblocker bypass - optimized for Pi
            await new Promise(resolve => setTimeout(resolve, 300));
            await this.page.evaluate(() => {
                const fakeAd = document.createElement('div');
                fakeAd.className = 'adsbygoogle';
                fakeAd.style.display = 'none';
                document.body.appendChild(fakeAd);
            });

            return true;
        } catch (error) {
            this.logger.error("Failed to navigate to Aternos:", error);
            await this.takeDebugScreenshot("01-ERROR-navigation-failed");
            return false;
        }
    }

    async takeDebugScreenshot(filename) {
        try {
            const fs = require('fs');
            const debugDir = './debug';
            
            // Create debug directory if it doesn't exist
            if (!fs.existsSync(debugDir)) {
                fs.mkdirSync(debugDir, { recursive: true });
            }
            
            // Pi Zero 2 W optimization: smaller, compressed screenshots
            await this.page.screenshot({ 
                path: `${debugDir}/${filename}.png`, 
                clip: { x: 0, y: 0, width: 800, height: 600 },
                quality: 40 // Lower quality for smaller files
            });
            this.logger.debug(`Screenshot saved: ${filename}.png`);
        } catch (error) {
            this.logger.error(`Failed to take ${filename} screenshot:`, error);
        }
    }

    async login() {
        try {
            this.logger.info("Starting login process...");
            if (this.progressCallback) {
                await this.progressCallback('login');
            }

            await new Promise((resolve) => setTimeout(resolve, 300)); // Optimized for Pi
            await this.takeDebugScreenshot("02-login-page-loaded");

            // Multi-method username input
            let usernameSuccess = false;
            
            // Method 1: Direct evaluation (fastest)
            this.logger.debug('Username Method 1: Direct evaluation');
            usernameSuccess = await this.page.evaluate((username) => {
                const fields = document.querySelectorAll('input[name="user"], input[name="username"], input[type="text"], input[type="email"]');
                for (const field of fields) {
                    if (field.offsetParent !== null) { // visible check
                        field.value = username;
                        field.dispatchEvent(new Event('input', { bubbles: true }));
                        field.dispatchEvent(new Event('change', { bubbles: true }));
                        return true;
                    }
                }
                return false;
            }, this.config.ATERNOS_USERNAME);
            
            if (usernameSuccess) {
                this.logger.info('✓ Username Method 1 worked: Direct evaluation');
            } else {
                // Method 2: Type method (fallback)
                this.logger.debug('Username Method 2: Type method');
                const usernameField = await this.page.$('input[name="user"], input[name="username"], input[type="text"]');
                if (usernameField) {
                    await this.page.type('input[name="user"], input[name="username"], input[type="text"]', this.config.ATERNOS_USERNAME);
                    usernameSuccess = true;
                    this.logger.info('✓ Username Method 2 worked: Type method');
                } else {
                    throw new Error("Username field not found with any method");
                }
            }
            
            await this.takeDebugScreenshot("03-username-entered");

            // Multi-method password input
            let passwordSuccess = false;
            
            // Method 1: Direct evaluation (fastest)
            this.logger.debug('Password Method 1: Direct evaluation');
            passwordSuccess = await this.page.evaluate((password) => {
                const field = document.querySelector('input[type="password"], input[name="password"]');
                if (field && field.offsetParent !== null) {
                    field.value = password;
                    field.dispatchEvent(new Event('input', { bubbles: true }));
                    field.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }
                return false;
            }, this.config.ATERNOS_PASSWORD);
            
            if (passwordSuccess) {
                this.logger.info('✓ Password Method 1 worked: Direct evaluation');
            } else {
                // Method 2: Type method (fallback)
                this.logger.debug('Password Method 2: Type method');
                const passwordField = await this.page.$('input[type="password"]');
                if (passwordField) {
                    await this.page.type('input[type="password"]', this.config.ATERNOS_PASSWORD);
                    passwordSuccess = true;
                    this.logger.info('✓ Password Method 2 worked: Type method');
                } else {
                    throw new Error("Password field not found with any method");
                }
            }
            
            await this.takeDebugScreenshot("04-credentials-entered");

            // Multi-method form submission
            let submitted = false;
            
            // Method 1: Direct login button click (fastest)
            this.logger.debug('Submit Method 1: Direct login button click');
            submitted = await this.page.evaluate(() => {
                const buttons = document.querySelectorAll('button, input[type="submit"], a, [role="button"]');
                for (const btn of buttons) {
                    const text = (btn.textContent || btn.value || '').toLowerCase();
                    if ((text.includes('login') || text.includes('sign in') || text.includes('anmelden') || text.includes('einloggen')) &&
                        btn.offsetParent !== null) { // visible check
                        btn.click();
                        return true;
                    }
                }
                return false;
            });
            
            if (submitted) {
                this.logger.info('✓ Submit Method 1 worked: Direct login button click');
            } else {
                // Method 2: Form submission (fallback)
                this.logger.debug('Submit Method 2: Form submission');
                const formSubmitted = await this.page.evaluate(() => {
                    const forms = document.querySelectorAll('form');
                    for (const form of forms) {
                        const passwordField = form.querySelector('input[type="password"]');
                        if (passwordField) {
                            form.submit();
                            return true;
                        }
                    }
                    return false;
                });
                
                if (formSubmitted) {
                    submitted = true;
                    this.logger.info('✓ Submit Method 2 worked: Form submission');
                } else {
                    // Method 3: Enter key press (last resort)
                    this.logger.debug('Submit Method 3: Enter key press');
                    await this.page.keyboard.press('Enter');
                    submitted = true;
                    this.logger.info('✓ Submit Method 3 worked: Enter key press');
                }
            }
            
            await this.takeDebugScreenshot("05-login-submitted");

            try {
                await this.page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 });
            } catch (error) {}

            // Multi-method login verification
            this.logger.debug('Verifying login success...');
            
            // Wait for page response
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const urlAfterLogin = this.page.url();
            const pageContent = await this.page.evaluate(() => document.body.textContent || '');
            
            // Method 1: URL-based verification
            let loggedIn = urlAfterLogin.includes("/servers") || 
                          urlAfterLogin.includes("/home") || 
                          !urlAfterLogin.includes("/go");
            
            // Method 2: Content-based verification
            if (!loggedIn) {
                loggedIn = pageContent.toLowerCase().includes('servers') ||
                          pageContent.toLowerCase().includes('dashboard') ||
                          !pageContent.toLowerCase().includes('password');
            }

            if (loggedIn) {
                await this.takeDebugScreenshot("06-login-successful");
                this.logger.info("✓ Successfully logged into Aternos");
                this.isLoggedIn = true;
                return true;
            } else {
                await this.takeDebugScreenshot("06-ERROR-login-failed");
                throw new Error("Login failed - check credentials");
            }
        } catch (error) {
            this.logger.error("Login failed:", error);
            await this.takeDebugScreenshot("06-ERROR-login-exception");
            return false;
        }
    }

    async navigateToServers() {
        try {
            // Method 1: Direct servers navigation
            this.logger.debug('Servers Navigation Method 1: Direct /servers/');
            try {
                await this.page.goto("https://aternos.org/servers/", {
                    waitUntil: "domcontentloaded",
                    timeout: 8000,
                });
                await this.takeDebugScreenshot("07-servers-page-loaded");
                this.logger.info('✓ Servers Navigation Method 1 worked: Direct /servers/');
                return true;
            } catch (error) {
                // Method 2: Dashboard navigation
                this.logger.debug('Servers Navigation Method 2: Dashboard route');
                await this.page.goto("https://aternos.org/server/", {
                    waitUntil: "domcontentloaded",
                    timeout: 8000,
                });
                await this.takeDebugScreenshot("07-servers-page-dashboard");
                this.logger.info('✓ Servers Navigation Method 2 worked: Dashboard route');
                return true;
            }
        } catch (error) {
            this.logger.error("Failed to navigate to servers:", error);
            await this.takeDebugScreenshot("07-ERROR-servers-navigation-failed");
            return false;
        }
    }

    async findAndStartServer() {
        try {
            this.logger.info(`Looking for ${this.config.SERVER_NAME} server...`);
            if (this.progressCallback) {
                await this.progressCallback('finding');
            }

            await this.takeDebugScreenshot("08-before-server-search");

            // Fast server finding with multiple optimized methods
            let foundServer = false;
            const serverName = this.config.SERVER_NAME.toLowerCase();
            
            // Method 1: Direct link click (fastest)
            this.logger.debug('Trying Method 1: Direct server link click');
            foundServer = await this.page.evaluate((serverName) => {
                const links = document.querySelectorAll('a[href*="server"], a[href*="go"]');
                for (const link of links) {
                    if (link.textContent && link.textContent.toLowerCase().includes(serverName)) {
                        link.click();
                        return true;
                    }
                }
                return false;
            }, serverName);
            
            if (foundServer) {
                this.logger.info('✓ Method 1 worked: Direct server link click');
            } else {
                // Method 2: Server card/button click
                this.logger.debug('Trying Method 2: Server card click');
                foundServer = await this.page.evaluate((serverName) => {
                    const cards = document.querySelectorAll('.server, [class*="server"], [data-server]');
                    for (const card of cards) {
                        if (card.textContent && card.textContent.toLowerCase().includes(serverName)) {
                            card.click();
                            return true;
                        }
                    }
                    return false;
                }, serverName);
                
                if (foundServer) {
                    this.logger.info('✓ Method 2 worked: Server card click');
                } else {
                    // Method 3: Any clickable element (fallback)
                    this.logger.debug('Trying Method 3: Any clickable element');
                    foundServer = await this.page.evaluate((serverName) => {
                        const clickables = document.querySelectorAll('a, button, [onclick]');
                        for (const el of clickables) {
                            if (el.textContent && el.textContent.toLowerCase().includes(serverName)) {
                                el.click();
                                return true;
                            }
                        }
                        return false;
                    }, serverName);
                    
                    if (foundServer) {
                        this.logger.info('✓ Method 3 worked: Generic clickable element');
                    }
                }
            }

            if (!foundServer) {
                await this.takeDebugScreenshot("08-ERROR-server-not-found");
                throw new Error(`Could not find "${this.config.SERVER_NAME}" server`);
            }

            await this.takeDebugScreenshot("09-server-found-clicked");

            // Quick navigation wait
            try {
                await this.page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 5000 });
            } catch (navError) {}

            await new Promise((resolve) => setTimeout(resolve, 500)); // Minimal delay

            // Fast start button finding
            this.logger.info("Looking for start button...");
            if (this.progressCallback) {
                await this.progressCallback('starting');
            }

            let startButton = null;
            let methodUsed = "";
            
            // Method 1: Direct start button click (fastest)
            this.logger.debug('Trying start button Method 1: Direct green/start buttons');
            const method1Success = await this.page.evaluate(() => {
                const buttons = document.querySelectorAll('button, a, [role="button"]');
                for (const btn of buttons) {
                    const text = (btn.textContent || '').toLowerCase();
                    const style = window.getComputedStyle(btn);
                    if ((text.includes('start') || text.includes('play')) && 
                        style.display !== 'none' && 
                        style.visibility !== 'hidden') {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });
            
            if (method1Success) {
                methodUsed = "Direct start button";
                startButton = true;
                this.logger.info('✓ Start Method 1 worked: Direct start button');
            } else {
                // Method 2: Green colored buttons
                this.logger.debug('Trying start button Method 2: Green colored buttons');
                const method2Success = await this.page.evaluate(() => {
                    const buttons = document.querySelectorAll('button, a');
                    for (const btn of buttons) {
                        const style = window.getComputedStyle(btn);
                        if ((style.backgroundColor.includes('green') || 
                             style.color.includes('green') ||
                             btn.className.includes('green') ||
                             btn.className.includes('success')) &&
                            style.display !== 'none') {
                            btn.click();
                            return true;
                        }
                    }
                    return false;
                });
                
                if (method2Success) {
                    methodUsed = "Green button";
                    startButton = true;
                    this.logger.info('✓ Start Method 2 worked: Green button');
                }
            }

            if (!startButton) {
                await this.takeDebugScreenshot("10-ERROR-no-start-button-found");
                
                // Debug: Log all visible buttons for troubleshooting
                const buttonInfo = await this.page.evaluate(() => {
                    const buttons = document.querySelectorAll('button, a, [role="button"]');
                    const info = [];
                    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
                        const btn = buttons[i];
                        if (btn.offsetParent !== null) {
                            info.push({
                                text: (btn.textContent || '').substring(0, 30),
                                className: (btn.className || '').substring(0, 30),
                                tagName: btn.tagName
                            });
                        }
                    }
                    return info;
                });
                
                this.logger.error("Available buttons on page:", buttonInfo);
                
                // Quick check if server is already running
                const runningText = await this.page.evaluate(() => document.body.textContent || "");
                if (runningText.toLowerCase().includes("online") || runningText.toLowerCase().includes("running")) {
                    this.logger.info("Server appears to already be running");
                    return { success: true, alreadyRunning: true };
                }
                throw new Error("Could not find start button - check debug screenshot");
            }

            await this.takeDebugScreenshot("11-start-button-clicked");

            this.logger.info(`✓ Start button clicked using: ${methodUsed}`);

            if (this.progressCallback) {
                await this.progressCallback('starting');
            }

            // Enhanced second start button handling with debugging
            this.logger.info('Checking for second start button (ad flow)...');
            await new Promise((resolve) => setTimeout(resolve, 1500)); // Wait for page updates
            await this.takeDebugScreenshot("12-after-first-start-click");
            
            const adButtonFound = await this.page.evaluate(() => {
                // Look for the second start button that appears after clicking first one
                const buttons = document.querySelectorAll('button, a, [role="button"]');
                for (const btn of buttons) {
                    const text = (btn.textContent || '').toLowerCase();
                    const style = window.getComputedStyle(btn);
                    
                    // Look for start buttons that might be related to ads
                    if ((text.includes('start') || text.includes('play') || 
                         text.includes('watch') || text.includes('continue')) && 
                        style.display !== 'none' && 
                        style.visibility !== 'hidden') {
                        btn.click();
                        return { found: true, text: text.substring(0, 50) };
                    }
                }
                return { found: false };
            });

            if (adButtonFound.found) {
                this.logger.info(`✓ Clicked second start button (ad): ${adButtonFound.text}`);
                await this.takeDebugScreenshot("13-second-start-button-clicked");
                
                // Enhanced ad completion wait
                this.logger.info('Waiting for ad/video to complete...');
                await new Promise((resolve) => setTimeout(resolve, 2500)); // Optimized for Pi
                await this.takeDebugScreenshot("14-after-ad-wait");
                
                // Check for final start button after ad completion
                const finalButton = await this.page.evaluate(() => {
                    const buttons = document.querySelectorAll('button, a, [role="button"]');
                    for (const btn of buttons) {
                        const text = (btn.textContent || '').toLowerCase();
                        const style = window.getComputedStyle(btn);
                        if ((text.includes('start') || text.includes('play') || text.includes('launch')) &&
                            style.display !== 'none' &&
                            btn.offsetParent !== null) {
                            btn.click();
                            return { found: true, text: text.substring(0, 30) };
                        }
                    }
                    return { found: false };
                });
                
                if (finalButton.found) {
                    this.logger.info(`✓ Clicked final start button: ${finalButton.text}`);
                    await this.takeDebugScreenshot("15-final-start-button-clicked");
                }
            } else {
                this.logger.info('No second start button found - proceeding with current flow');
            }

            // Final verification and completion
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.takeDebugScreenshot("16-server-start-completed");
            this.logger.info('🚀 Server start sequence completed successfully!');
            return { success: true, alreadyRunning: false };

        } catch (error) {
            this.logger.error("Failed to start server:", error);
            return { success: false, error: error.message };
        }
    }

    async startServer(progressCallback = null) {
        this.progressCallback = progressCallback;
        try {
            if (!this.page) {
                const pageCreated = await this.createPage();
                if (!pageCreated) throw new Error("Failed to create browser page");
            }

            const navigated = await this.navigateToAternos();
            if (!navigated) throw new Error("Failed to navigate to Aternos");

            if (!this.isLoggedIn) {
                const loggedIn = await this.login();
                if (!loggedIn) throw new Error("CAPTCHA intervention, wait 60 minutes");
            }

            const currentUrl = this.page.url();
            if (!currentUrl.includes("/servers")) {
                const serversNavigated = await this.navigateToServers();
                if (!serversNavigated) throw new Error("Failed to navigate to servers page");
            }

            const result = await this.findAndStartServer();
            return result;
        } catch (error) {
            this.logger.error("Error during server startup:", error);
            return { success: false, error: error.message };
        }
    }

    async cleanup() {
        try {
            if (this.page) await this.page.close();
            if (this.browser) await this.browser.close();
            this.logger.info("Browser cleanup completed");
        } catch (error) {
            this.logger.error("Error during cleanup:", error);
        }
    }
}

module.exports = AternosService;