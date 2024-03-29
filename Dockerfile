FROM ubuntu

RUN apt-get update && apt-get install -y curl bash git && \
    curl -sL https://deb.nodesource.com/setup_10.x | bash && \
    apt-get install -y nodejs && \
    git clone https://github.com/JoonasSa/grpc-client-server.git && \
    mv grpc-client-server app && \
    cd app && \
    npm install && \
    # slim down the image
    apt-get purge -y --auto-remove curl git && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV HOST_NAME=0.0.0.0
ENV PORT_NUMBER=5000

CMD ["node", "server.js"]
