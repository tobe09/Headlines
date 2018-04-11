const express = require('express');
const app = express();
const socketIo = require("socket.io");

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const port = process.env.port || 3000;

const router = require('./src/router.js').router;
app.use('/', router);

const setSubscr = require('./src/router.js').setSubscr;


//const https = require('https');
//const path = require('path');
//const fs = require('fs');

//var rootLocation = path.join(__dirname, '../');
//const options = {
//    key: fs.readFileSync(rootLocation + 'Headlines/src/assets/headlineServer.key'),
//    cert: fs.readFileSync(rootLocation + 'Headlines/src/assets/headlineServer.crt'),
//    passphrase: '1234'
//};
//
//const server = https.createServer(options, app);

const svr = app.listen(port, function () {
    console.log('Server now running on port: ' + svr.address().port);
});

const io = socketIo.listen(svr);
const serverSocket = io.sockets;
let clientSocket;
let connections = 0;

serverSocket.on('connection', clntSocket => {
    connections++;
    console.log('client connected: ' + clntSocket.id + '    (' + connections + ' connection(s))');
    clientSocket = clntSocket;
});

serverSocket.on('clientDisconnected', id => {
    console.log('client disconnected: ' + id + '    (' + connections + ' connection(s))');
});

setSubscr((newsArr,code)=>{
    if (!clientSocket) return;

    clientSocket.emit('updatedNews', newsArr, code);

    clientSocket.on('disconnect', msg => {
        connections--;
        serverSocket.emit('clientDisconnected', clientSocket.id);
        console.log('client disconnected: ' + clientSocket.id + '    (' + connections + ' connection(s))');
    });
});