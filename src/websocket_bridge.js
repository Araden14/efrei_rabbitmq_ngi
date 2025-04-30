import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import amqplib from 'amqplib';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure environment variables
dotenv.config({ path: '../.env' });

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Express
const app = express();
const server = createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// RabbitMQ connection settings
const rabbitmq_url = `amqp://${process.env.LOGIN}:${process.env.PASSWORD}@${process.env.URL}`;
const results_queue = 'results';

// Keep track of connected clients
let connectedClients = 0;

// Connect to RabbitMQ and listen for results
async function listenToResultsQueue() {
  try {
    console.log(`Connecting to RabbitMQ at ${process.env.URL}...`);
    console.log(`Listening to results queue: "${results_queue}"`);
    
    // Connect to RabbitMQ
    const connection = await amqplib.connect(rabbitmq_url);
    const channel = await connection.createChannel();
    
    // Make sure queue exists
    await channel.assertQueue(results_queue, { 
      durable: true, 
      autoDelete: false 
    });
    
    console.log('✅ Successfully connected to RabbitMQ');
    
    // Listen for results from the queue
    channel.consume(results_queue, (msg) => {
      if (msg !== null) {
        try {
          // Parse the message
          const rawMessage = msg.content.toString();
          console.log(`📨 Message received: ${rawMessage}`);
          
          const content = JSON.parse(rawMessage);
          
          // Broadcast to all connected clients
          io.emit('calculation_result', content);
          console.log(`📡 Result forwarded to ${connectedClients} client(s)`);
          
          // Acknowledge the message
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          // Acknowledge the message even if processing failed
          channel.ack(msg);
        }
      }
    });
    
    // Handle connection close
    process.on('SIGINT', async () => {
      console.log('Closing RabbitMQ connection...');
      await channel.close();
      await connection.close();
      process.exit(0);
    });
    
    return { connection, channel };
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.error(`Could not connect to RabbitMQ at ${process.env.URL}. Make sure RabbitMQ is running.`);
    } else if (error.code === 'ENOTFOUND') {
      console.error(`Could not resolve RabbitMQ host at ${process.env.URL}. Check your network connection.`);
    }
    
    // Return null to indicate failure
    return null;
  }
}

// Handle socket connections
io.on('connection', (socket) => {
  connectedClients++;
  console.log(`👤 Client connected (Total: ${connectedClients})`);
  
  // Send a welcome message
  socket.emit('calculation_result', {
    n1: 0,
    n2: 0,
    op: 'info',
    result: 'Connected to RabbitMQ monitor'
  });
  
  socket.on('disconnect', () => {
    connectedClients--;
    console.log(`👤 Client disconnected (Total: ${connectedClients})`);
  });
});

// Start the server
async function startServer() {
  try {
    // Start listening for results from RabbitMQ
    const rabbitMQ = await listenToResultsQueue();
    
    // Start the HTTP server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      
      if (!rabbitMQ) {
        console.warn('⚠️ Warning: Not connected to RabbitMQ. No results will be shown.');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

// Start everything
startServer(); 