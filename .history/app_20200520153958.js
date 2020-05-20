import express from 'express';
const app = express();
import { listen } from "socket.io";


import { urlencoded, json } from "body-parser";
app.use(urlencoded({ extended: true }));
app.use(json());


import { router } from './src/router.js';
app.use('/', router);


import { addNewsHandler } from './src/router.js';     //subscribe a method to be notified by socket of new articles
import { removeNewsHandler } from './src/router.js';     //subscribe a method to be notified by socket of new articles

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
