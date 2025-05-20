// serverless-adsPower.js
// AdsPower browser management for serverless environments
import axios from 'axios';
import puppeteer from 'puppeteer-core';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Configuration options for AdsPower API
 */
const defaultConfig = {
  // API endpoint URLs - can be overridden by environment variables
  adsPowerApiUrl: process.env.ADSPOWER_API_URL || 'http://local.adspower.net:50325',
  adsPowerRemoteApiUrl: process.env.ADSPOWER_REMOTE_API_URL, // e.g., 'https://your-adspower-server.com'
  
  // API key - should be set in environment variables
  adsPowerApiKey: process.env.ADSPOWER_API_KEY || 'b996c078e3bfdb1dcc0cd3f26ea4c949',
  
  // Browser options
  headless: process.env.ADSPOWER_HEADLESS === 'false' ? false : true,
  launchArgs: JSON.stringify([
    "--remote-debugging-port=52918",
    "--headless=1",
  ]),
  
  // Connection settings
  timeout: parseInt(process.env.ADSPOWER_TIMEOUT || '60000', 10),
  
  // Default Browser ID (can be overridden)
  defaultUserId: process.env.ADSPOWER_DEFAULT_USER_ID || 'kn8o287'
};

/**
 * Client for managing AdsPower browser instances in serverless environments
 */
class AdsPowerClient {
  constructor(config = {}) {
    this.config = { ...defaultConfig, ...config };
    
    // Use remote API URL if provided, otherwise use local API URL
    this.apiBaseUrl = this.config.adsPowerRemoteApiUrl || this.config.adsPowerApiUrl;
    
    console.log(`AdsPower client configured with API base URL: ${this.apiBaseUrl}`);
  }
  
  /**
   * Check if a browser profile is active
   * @param {string} userId - User ID for the browser profile
   * @returns {Promise<Object>} - Response with status
   */
  async checkBrowserStatus(userId = this.config.defaultUserId) {
    try {
      const url = `${this.apiBaseUrl}/api/v1/browser/active`;
      console.log(`Checking browser status for ${userId} at ${url}`);
      
      const response = await axios.get(url, {
        params: { user_id: userId },
        timeout: this.config.timeout
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error checking browser status: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Start a browser profile
   * @param {string} userId - User ID for the browser profile
   * @returns {Promise<Object>} - Response with WebSocket endpoint
   */
  async startBrowser(userId = this.config.defaultUserId) {
    try {
      const url = `${this.apiBaseUrl}/api/v1/browser/start`;
      console.log(`Starting browser for ${userId} at ${url}`);
      
      const response = await axios.get(url, {
        params: {
          user_id: userId,
          launch_args: this.config.launchArgs
        },
        timeout: this.config.timeout
      });
      
      if (response.data.code !== 0) {
        throw new Error(`Failed to start browser: ${JSON.stringify(response.data)}`);
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error starting browser: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Stop a browser profile
   * @param {string} userId - User ID for the browser profile
   * @returns {Promise<Object>} - Response with status
   */
  async stopBrowser(userId = this.config.defaultUserId) {
    try {
      const url = `${this.apiBaseUrl}/api/v1/browser/stop`;
      console.log(`Stopping browser for ${userId} at ${url}`);
      
      const response = await axios.get(url, {
        params: { user_id: userId },
        timeout: this.config.timeout
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error stopping browser: ${error.message}`);
      // Don't throw, just log the error when stopping the browser
      return { code: 1, msg: error.message };
    }
  }
  
  /**
   * Get a connected browser instance
   * @param {string} userId - User ID for the browser profile
   * @returns {Promise<Browser>} - Connected Puppeteer browser instance
   */
  async getBrowser(userId = this.config.defaultUserId) {
    try {
      // Check if browser is already active
      let statusResponse = await this.checkBrowserStatus(userId);
      
      // If not active, start it
      if (statusResponse.code !== 0 || statusResponse.data.status !== 'Active') {
        console.log(`Browser not active, starting new browser for ${userId}`);
        const startResponse = await this.startBrowser(userId);
        
        if (!startResponse.data.ws || !startResponse.data.ws.puppeteer) {
          throw new Error('Failed to get WebSocket endpoint from browser start response');
        }
        
        statusResponse = startResponse;
      }
      
      // Get WebSocket endpoint
      const wsEndpoint = statusResponse.data.ws.puppeteer;
      console.log(`Connecting to browser WebSocket endpoint: ${wsEndpoint}`);
      
      // Connect to browser
      const browser = await puppeteer.connect({
        browserWSEndpoint: wsEndpoint,
        defaultViewport: null,
      });
      
      return browser;
    } catch (error) {
      console.error(`Error getting browser instance: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Create a new page in the browser
   * @param {Browser} browser - Connected browser instance
   * @returns {Promise<Page>} - New browser page
   */
  async createPage(browser) {
    try {
      // Get all existing pages
      const pages = await browser.pages();
      console.log(`Current open pages: ${pages.length}`);
      
      // Close extra pages if there are too many (keeping max 20 open)
      if (pages.length > 20) {
        console.log('Too many pages open, closing excess pages');
        for (let i = 0; i < pages.length - 20; i++) {
          try {
            if (pages[i] && !pages[i].isClosed()) {
              await pages[i].close().catch(e => console.log(`Error closing page ${i}: ${e.message}`));
            }
          } catch (err) {
            console.log(`Error handling page ${i}: ${err.message}`);
          }
        }
      }
      
      // Create new page
      const page = await browser.newPage();
      
      // Set anti-detection measures
      await page.evaluateOnNewDocument(() => {
        // Hide automation flags
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        
        // Mock Chrome properties
        window.navigator.chrome = { runtime: {} };
        
        // Mock permissions API
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
        
        // Add fake plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
        
        // Set realistic languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['zh-CN', 'zh', 'en-US', 'en'],
        });
        
        // Set realistic platform
        Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
        Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.' });
      });
      
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      
      return page;
    } catch (error) {
      console.error(`Error creating page: ${error.message}`);
      throw error;
    }
  }
}

// Convenience functions for more direct usage
export async function launchAdsPowerBrowser(userId, apiUrl = null) {
  const config = apiUrl ? { adsPowerRemoteApiUrl: apiUrl } : {};
  const client = new AdsPowerClient(config);
  return await client.getBrowser(userId);
}

export async function createAdsPowerPage(browser) {
  const client = new AdsPowerClient();
  return await client.createPage(browser);
}

export async function closeAdsPowerBrowser(userId, apiUrl = null) {
  const config = apiUrl ? { adsPowerRemoteApiUrl: apiUrl } : {};
  const client = new AdsPowerClient(config);
  return await client.stopBrowser(userId);
}

export default AdsPowerClient;