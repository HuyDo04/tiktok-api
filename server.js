require('dotenv').config();
require('module-alias/register');

const cors = require("cors");
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const router = require("./src/routes");
const cookieParser = require('cookie-parser');
const initializeSocket = require('./src/socket');

const app = express();
const server = http.createServer(app);

const port = process.env.PORT || 3000;
const clientOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

console.log(`CORS Origin configured for: ${clientOrigin}`);

const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ["GET", "POST"],
    credentials: true
  }
});

initializeSocket(io);

app.use(cors({
  origin: clientOrigin,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use(express.static("public"));

app.use("/api/v1", router);

server.listen(port, () => {
  console.log(`Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
});
