const protoLoader = require('@grpc/proto-loader');
const grpcLibrary = require('grpc');
const request = require('request');

const PROTO_FILE_PATH = '.proto';
const PORT_NUMBER = 50051;

const protoLoaderOptions = {
    keepCase: true, // preserver field names as is
};

const packageDefinition = protoLoader.loadSync(PROTO_FILE_PATH, protoLoaderOptions);
const packageObject = grpcLibrary.loadPackageDefinition(packageDefinition);
const urlService = packageObject.UrlService.service;

// manages the bidirectional stream
const manageUrlStream = (connection) => {
    // Number of responses we have sent back to the client.
    let responsesSentSum = 0;
    // Message with lastRequest = true contains this number. The server still has to take care of pending curls and out of order/lost messages. 
    let requestMadeTotal = undefined;

    connection.on('data', (req) => {

        console.log('server received', req);

        if (req.isLastRequest) {
            requestMadeTotal = req.requestMadeTotal;
        }

        // request library doesn't like empty urls
        if (req.url.length === 0) {
            connection.write({
                data: '',
                url: req.url,
                statusCode: '404'
            });
            return;
        }

        request.get(req.url, (error, response, body) => {
            // TODO: This is potentially too strict with the status 200 requirement + These codes are not too informative
            const statusCode = error !== null ? '500' :
                !response ? '500' :    
                response.statusCode;

            responsesSentSum++;

            connection.write({
                data: body,
                url: req.url,
                statusCode: statusCode
            });

            if (responsesSentSum === requestMadeTotal) {
                console.log('Server terminates the connection...');
                connection.end();
            }
        });
    });
    // TODO: when is this called?
    connection.on('error', function(e) {
        console.error(`Error occurred while streaming: ${e}`);
    });
};

// create the server
const server = new grpcLibrary.Server();
server.addService(urlService, {
    getUrlContentStream: manageUrlStream
});

// try to bind the server to a port and then run it 
server.bindAsync(`localhost:${PORT_NUMBER}`, grpcLibrary.ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
        console.error('Run into following error while trying to bind port to server:', error);
        process.exit(1);
    }
    if (port !== PORT_NUMBER) {
        console.error(`Couldn\'t bind port to ${PORT_NUMBER}`);
        process.exit(2);
    }
    console.log(`Server listening in port ${port}`);
    server.start();
});