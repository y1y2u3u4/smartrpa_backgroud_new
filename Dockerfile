FROM node:19.2.0-slim

# ENV http_proxy=http://10.67.47.76:1082
# ENV https_proxy=http://10.67.47.76:1082



ARG VERSION
ENV VERSION=${VERSION:-dirty}
ARG BUILD_DATE
ARG VCS_REF
ENV ENVIRONMENT=cloud
ENV OUTPUT_DIR=/app/output

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD false

LABEL MAINTAINER=mingalevme@gmail.com \
    org.label-schema.schema-version="1.0" \
    org.label-schema.name="Google Puppeteer (screenshot) as a Dockerized HTTP-service" \
    org.label-schema.version="$VERSION" \
    org.label-schema.build-date=$BUILD_DATE \
    org.label-schema.vcs-url="https://github.com/mingalevme/screenshoter" \
    org.label-schema.vcs-ref=$VCS_REF \
    org.label-schema.vendor="Mikhail Mingalev" \
    org.label-schema.docker.cmd="docker run -d --restart always -p 8080:8080 --name screenshoter mingalevme/screenshoter"



WORKDIR /app


# wget http://dl.google.com/linux/chrome/deb/pool/main/g/google-chrome-stable/google-chrome-stable_126.0.6478.126-1_amd64.deb

# ADD google-chrome-stable_126.0.6478.126-1_amd64.deb /tmp/
# RUN dpkg -i /tmp/google-chrome-stable_126.0.6478.126-1_amd64.deb || true
# RUN apt-get install -fy

# Install dependencies and Google Chrome
RUN echo "Step 1: Updating apt-get and installing prerequisites..." && \
    apt-get update --fix-missing && \
    apt-get install --fix-missing -y wget gnupg && \
    # echo "Step 2: Adding Google Chrome signing key..." && \
    # wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    # echo "Step 3: Adding Google Chrome repository..." && \
    # sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
    # echo "Step 4: Updating apt-get with new repository..." && \
    # apt-get update && \
    # echo "Step 5: Installing Google Chrome  packages..." && \
    apt-get install -y --no-install-recommends \
    # google-chrome-stable \
    chromium \
    xvfb \
    x11vnc \
    fluxbox \
    supervisor \
    python3 \
    python3-pip \
    unzip \
    nginx \
    curl \
    net-tools \
    telnet \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    fonts-terminus \
    fonts-inconsolata \
    fonts-dejavu \
    ttf-bitstream-vera \
    fonts-noto-core \
    fonts-noto-cjk \
    fonts-noto-extra \
    fonts-font-awesome \
    libxss1 \
    procps \
    xauth \
    ca-certificates && \
    echo "Step 6: Cleaning up apt-get cache..." && \
    rm -rf /var/lib/apt/lists/* /tmp/*.deb && \
    # echo "Step 7: Moving AppleColorEmoji.ttf to fonts directory..." && \
    # mv ./AppleColorEmoji.ttf /usr/local/share/fonts/AppleColorEmoji.ttf && \
    echo "Step 8: Setting up user and permissions..." && \
    groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser && \
    mkdir -p /home/pptruser/Downloads && \
    mkdir -p /app/output && \
    chown -R pptruser:pptruser /app/output && \
    chown -R pptruser:pptruser /home/pptruser && \
    chown -R pptruser:pptruser /app && \
    mkdir -p /var/cache/screenshoter && \
    chown -R pptruser:pptruser /var/cache/screenshoter && \
    echo "Step 9: Refreshing font cache..." && \
    fc-cache -fv
# 升级 pip 并安装必要的 Python 包
# 更新 pip 并安装 numpy
RUN python3 -m pip install --upgrade pip && \
    python3 -m pip install numpy==1.21.2


# Install noVNC
RUN wget https://github.com/novnc/websockify/archive/master.zip -O /tmp/websockify.zip && \
    unzip /tmp/websockify.zip -d /opt && \
    cd /opt/websockify-master && \
    python3 setup.py install


# 安装 noVNC
RUN wget https://github.com/novnc/noVNC/archive/v1.2.0.zip -O /tmp/novnc.zip && \
    unzip /tmp/novnc.zip -d /opt && \
    mv /opt/noVNC-1.2.0 /opt/novnc && \
    ln -s /opt/novnc/utils/launch.sh /usr/local/bin/launch_novnc.sh && \
    chmod +x /opt/novnc/utils/launch.sh

# 设置默认 VNC 密码
RUN x11vnc -storepasswd your_password /etc/x11vnc.pass

# 复制应用代码
COPY . .
USER root
RUN echo "Step 2: Installing Node.js dependencies..." && \
    npm install --only=production && \
    npm cache clean --force
RUN which chromium

# RUN chown -R pptruser:pptruser /root/.config
# Install Node.js dependencies and check Puppeteer Chromium
# RUN echo "Step 10: Installing Node.js dependencies..." && \
#     npm install --only=production && \
#     echo "Step 11: Checking npm install result..." && \
#     if [ $? -eq 0 ]; then echo "npm install succeeded"; else echo "npm install failed"; exit 1; fi && \
#     echo "Step 12: Installing Puppeteer Chromium..." && \
#     npx puppeteer install && \
#     echo "Step 13: Checking Puppeteer Chromium path..." && \
#     node -e "const puppeteer = require('puppeteer'); puppeteer.launch().then(browser => { console.log('Chromium executable path:', browser._process.spawnfile); return browser.close(); }).catch(error => { console.error('Failed to launch Puppeteer:', error); process.exit(1); });" && \
#     npm cache clean --force

# COPY package*.json ./
# COPY node_modules ./node_modules
# COPY . .

# USER pptruser

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY nginx.conf /etc/nginx/nginx.conf
# Start xvfb and set DISPLAY environment variable

# 复制并设置 start.sh 启动脚本
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh
RUN chmod +x /opt/novnc/utils/launch.sh

# USER pptruser
ENV DISPLAY=:99
# 使用 ENTRYPOINT 来运行 start.sh
ENTRYPOINT ["/app/start.sh"]
# CMD ["node", "/app/server.js"]

EXPOSE 8081




# HEALTHCHECK --interval=1m --timeout=1s \
#     CMD wget -O- http://127.0.0.1:8080/ping > /dev/null 2>&1


# docker build --platform linux/amd64 --no-cache --network=host -t test-container .
# docker build . \
#     --platform linux/amd64 \
#     --build-arg "HTTP_PROXY=http://192.168.0.212:1082/" \
#     --build-arg "HTTPS_PROXY=http://192.168.0.212:1082/" \
#     --build-arg "NO_PROXY=localhost,127.0.0.1,.example.com" \
#     -t test-container:latest
##云端部署
# gcloud builds submit --config cloudbuild.yaml
# gcloud builds submit --config cloudbuild.yaml --verbosity=debug --timeout=3600s
# gcloud builds submit  --tag us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest
# docker build . --platform linux/amd64 --tag us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test:latest
# docker push us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest


# docker run -d -p 8081:8081 --name my-container test-container
# docker run -d -p 8081:8081 -p 5900:5900 -p 6080:6080 --name my-container test-container:latest
# docker run -d -p 8081:8081 -p 5900:5900 -p 6080:6080 --shm-size=2g --name my-container test-container:latest
##云端启动
# gcloud run deploy test1-container --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-001 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-002 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-003 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-004 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-005 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-006 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-007 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-008 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-009 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-010 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-011 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-012 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-013 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-014 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-015 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-016 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-017 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-018 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud
# gcloud run deploy test1-container-019 --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest --timeout 3000s --cpu 2 --memory 4Gi   --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud

##配置vpc
# gcloud run deploy test1-container-1 \
#     --image us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest \
#     --timeout 3000s \
#     --cpu 2 \
#     --memory 4Gi \
#     --max-instances 5 \
#     --port 8081 \
#     --region us-central1 \
#     --set-env-vars ENVIRONMENT=cloud \
#     --vpc-connector test \
#     --vpc-egress all \
#     --allow-unauthenticated



# http://localhost:6080/vnc.html

# https://test1-container-omqcnm4zaq-uc.a.run.app/novnc/vnc.html

##构建队列
# gcloud tasks queues create smartworkflow \
#     --log-sampling-ratio=1.0 \
#     --location=us-central1

# gcloud tasks queues describe smartworkflow \
#     --location=us-central1


# gcloud tasks create-http-task \
#     --queue=smartworkflow \
#     --url=https://test1-container-omqcnm4zaq-uc.a.run.app/scrape \
#     --method=GET \
#     --location=us-central1 \
#     --project=civil-zodiac-422613-b7


##部署到本地
# curl https://sdk.cloud.google.com | bash
# gcloud init
# gcloud --version
# gcloud auth configure-docker
# docker pull us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest
# docker run -d -p 8081:8081 \
#     --name my-container \
#     -e ENVIRONMENT=cloud \
#     -v /Users/xyx/Downloads/docker-output:/app/output \
#     us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest

##挂载目录
# docker run -v /path/on/host:/app/output your-image-name
# docker run -v C:\Users\YourName\Desktop\docker-output:/app/output your-image-name
