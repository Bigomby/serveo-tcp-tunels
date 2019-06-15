const ssh2 = require("ssh2");
const net = require("net");
const fs = require("fs");

(async () => {
  const servers = [
    {
      alias: "loballecasa",
      username: "pi",    
      port: 8000,
      password: "raspberry"
    }
  ];

  servers.forEach(async server => {
    const serveo = await connectServeo();
    const privateKey = fs.readFileSync("/home/diego/.ssh/id_rsa");
    const connection = await initServeo(
      serveo,
      server.alias,
      server.username,
      privateKey,
      server.password
    );

    await startServer(connection, server.port);
    console.log(`Connected to ${server.alias}`);
  });
})();

function connectServeo() {
  return new Promise((resolve, reject) => {
    const serveo = new ssh2();
    serveo.connect({
      host: "serveo.net",
      username: "dummy",
      tryKeyboard: true
    });

    serveo.once("ready", () => resolve(serveo));
    serveo.once("error", err => reject(err));
  });
}

function initServeo(serveo, alias, username, privateKey, password) {
  return new Promise((resolve, reject) => {
    const connection = new ssh2();

    serveo.forwardOut("localhost", 0, alias, 0, function(err, stream) {
      if (err) {
        reject(err);
        return;
      }

      connection.connect({ sock: stream, username, privateKey, password });
      connection.once("ready", () => resolve(connection));
      connection.once("error", err => reject(err));
    });
  });
}

function createForwarder(socket) {
  return function(error, stream) {
    if (error) {
      return conn2.end();
    }

    socket.pipe(stream);
    stream.pipe(socket);
  };
}

function startServer(connection, port) {
  return new Promise(resolve => {
    const server = net.createServer(socket => {
      const forwarder = createForwarder(socket);
      connection.forwardOut("localhost", port, "localhost", port, forwarder);
    });

    server.listen(port, "localhost", () => resolve(server));
  });
}
