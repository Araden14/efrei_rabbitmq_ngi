
import random from 'random';
import amqplib from 'amqplib';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const rabbitmq_url = `amqp://${process.env.USERNAME}:${process.env.PASSWORD}@${process.env.URL}`;

const operations = ["add", "sub", "mul", "div"];

function createCalc(){
    const first = random.int(0,100);
    const second = random.int(0,1000);
    const query = { n1: first, n2: second };

    const operation = operations[random.int(0,3)];

    return [query, operation];
}

async function send() {
    // Connexion
    const connection = await amqplib.connect(rabbitmq_url);

    // Création du channel
    const channel = await connection.createChannel();

    const { queue } = await channel.assertQueue("add_worker")

    const [query, operation] = createCalc();

    channel.sendToQueue(queue, Buffer.from(JSON.stringify(query)));

    console.log("Message envoyé");

    return
}

// Fonction pour envoyer des messages indéfiniment toutes les 5 secondes
function sendMessagesIndefinitely() {
    send().catch(err => console.error('Error sending message:', err));
    
    setTimeout(sendMessagesIndefinitely, 5000);
}
sendMessagesIndefinitely();
