#!/bin/bash

# Remove lock file if it exists
if [ -e /tmp/.X99-lock ]; then
    rm /tmp/.X99-lock
fi

# Start supervisord
echo "Starting supervisord..."
/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf &

# Wait for supervisord to start
sleep 5

# Check if services are running
echo "Checking services status..." | tee -a /var/log/startup.log

# Check Xvfb
if pgrep Xvfb > /dev/null
then
    echo "Xvfb is running." | tee -a /var/log/startup.log
else
    echo "Xvfb is not running." | tee -a /var/log/startup.log
fi

# Check x11vnc
if pgrep x11vnc > /dev/null
then
    echo "x11vnc is running." | tee -a /var/log/startup.log
else
    echo "x11vnc is not running." | tee -a /var/log/startup.log
fi

# Check noVNC
if pgrep launch.sh > /dev/null
then
    echo "noVNC is running." | tee -a /var/log/startup.log
else
    echo "noVNC is not running." | tee -a /var/log/startup.log
fi

# Check app
if pgrep node > /dev/null
then
    echo "Node.js app is running." | tee -a /var/log/startup.log
else
    echo "Node.js app is not running." | tee -a /var/log/startup.log
fi

# Check port listening status
echo "Checking port listening status..." | tee -a /var/log/startup.log
netstat -tuln | tee -a /var/log/startup.log

# Check services with curl
echo "Checking services with curl..." | tee -a /var/log/startup.log
curl -I http://localhost:8082/scrape | tee -a /var/log/startup.log
curl -I http://localhost:6080 | tee -a /var/log/startup.log
curl -I http://localhost:5900 | tee -a /var/log/startup.log


# Check Puppeteer Chromium path
echo "Checking Puppeteer Chromium path..." | tee -a /var/log/startup.log
node -e "const puppeteer = require('puppeteer'); console.log('Chromium executable path:', puppeteer.executablePath());" | tee -a /var/log/startup.log

# Start Nginx
echo "Starting Nginx..." | tee -a /var/log/startup.log
nginx -g 'daemon off;'