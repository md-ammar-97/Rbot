FROM n8nio/n8n:latest

# n8n data is stored at /home/node/.n8n
# Render Disk is mounted there via render.yaml
USER root
RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node/.n8n
USER node
