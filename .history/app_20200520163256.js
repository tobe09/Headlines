const express = require('express');
const app = express();
const listen = require('socket.io').listen;


const { urlencoded, json } = require('body-parser');
app.use(urlencoded({ extended: true }));
app.use(json());


const { router, addNewsHandler, removeNewsHandler } = require('./router.js');
console.log(addNewsHandler)
app.use('/', router);


const port = process.env.PORT || 3000;   

const svr = app.listen(port, function () {
    console.log('Server now running on port: ' + svr.address().port);
});


const io = listen(svr);
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