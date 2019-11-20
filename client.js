const protoLoader = require('@grpc/proto-loader');
const grpcLibrary = require('grpc');

const PROTO_FILE_PATH = '.proto';
const PORT_NUMBER = 5000;

const NUM_OF_REQUEST = 100;

const protoLoaderOptions = {
    keepCase: true, // preserver field names as is
};

const packageDefinition = protoLoader.loadSync(PROTO_FILE_PATH, protoLoaderOptions);
const packageObject = grpcLibrary.loadPackageDefinition(packageDefinition);
const client = new packageObject.UrlService(`localhost:${PORT_NUMBER}`, grpcLibrary.credentials.createInsecure());

const convertToProtoBufObject = (urls) => {
    return urls.map((url, index) => {
        return (index === urls.length - 1
            ? { url: url, isLastRequest: true, requestMadeTotal: urls.length }
            : { url: url, isLastRequest: false })
    });
}

// send the urls and receive the raw data
const runUrlStream = (urls) => {
    let numOfReceivedResponses = 0;
    let stopSending = false;
    const connection = client.getUrlContentStream();
    connection.on('data', (response) => {
        // TODO: is this too strict?
        if (response.statusCode !== '200') {
            console.log(`ERROR, URL: ${response.url}, STATUSCODE: ${response.statusCode}`);
        } else {
            numOfReceivedResponses += 1;
            console.log('Client received data', response.data);
        }
    });
    connection.on('end', () => {
        console.log('Client receives last response...');
        console.log('Received contents from', numOfReceivedResponses, 'urls');
        stopSending = true;
        connection.end();
        process.exit(0);
    });
    connection.on('error', function(e) {
        console.error(`Error occurred while streaming: ${e}`);
    });

    convertToProtoBufObject(urls).forEach((url) => {
        setTimeout(() => {
            if (!stopSending) {
                console.log('client sending', url); 
                connection.write(url);
            }
        }, 100 * Math.random());
    });
};

setTimeout(() => {
    console.log(`Client starts sending ${NUM_OF_REQUEST} requests`);
    const urls = Array(NUM_OF_REQUEST).fill('http://example.com');
    runUrlStream(urls);
}, 1000);