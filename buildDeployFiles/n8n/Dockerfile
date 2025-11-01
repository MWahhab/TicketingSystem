FROM n8nio/n8n

USER root

COPY buildDeployFiles/n8n/init.sh /init.sh
COPY buildDeployFiles/n8n/*.json /workflows/

RUN chmod +x /init.sh

USER node

ENTRYPOINT ["/bin/sh", "/init.sh"]