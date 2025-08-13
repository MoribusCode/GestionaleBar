module.exports = function (fastify, opts, done) {
  fastify.register(require('@fastify/websocket'));

  //quando un client apre una connessione ws chiamo la route get qui sotto
  fastify.get('/ws', { websocket: true }, (connection /* SocketStream */, req) => {
    console.log('WebSocket client connected');
    
    //eg.: connection.socket.on('nome_evento', contenuto_ricevuto_dal_client => {...

    connection.socket.on('message', message => {
      console.log('Received:', message.toString());
      connection.socket.send(`Server got: ${message}`);
    });

    connection.socket.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  done();
};
