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

const io=socketIo.listen(svr);
let mySocket;

io.sockets.on('connection', socket => {
    console.log('client connected: ' + socket.id);
    mySocket = socket;
});

io.sockets.on('disconnection', socket => {
    console.log('client disconnected: ' + socket.id);
});

setSubscr((newsArr,code)=>{
    if (!mySocket) return;
    mySocket.emit('updatedNews', newsArr, code);
});