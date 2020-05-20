const express = require('express');
const app = express();
const socketIo = require("socket.io");


const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


const router = require('./src/router.js').router;
app.use('/', router);


const addNewsHandler = require('./src/router.js').addNewsHandler;     //subscribe a method to be notified by socket of new articles
const removeNewsHandler = require('./src/router.js').removeNewsHandler;     //subscribe a method to be notified by socket of new articles

const port = process.env.PORT || 3000;   

const svr = app.listen(port, function () {
    console.log('Server now running on port: ' + svr.address().port);
});


const io = socketIo.listen(svr);
const serverSocket = io.sockets;
let connections = 0;


serverSocket.on('connection', clientSocket => {
    connections++;
    console.log('client connected: ' + clientSocket.id + '    (' + connections + ' connection(s))');

    //add a handler for news notifications
    addNewsHandler(clientSocket.id, (newsArr, code) => {
        clientSocket.emit('updatedNews', newsArr, code);

        clientSocket.on('disconnect', msg => {
            connections--;
            console.log('client disconnected: ' + clientSocket.id + '    (' + connections + ' connection(s))');
            removeNewsHandler(clientSocket.id);
        });
    });
});
