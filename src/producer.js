
import random from 'random';
import amqplib from 'amqplib';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const rabbitmq_url = `amqp://${process.env.USERNAME}:${process.env.PASSWORD}@${process.env.URL}`;
const exchange = 'AVG_project_calc_exchange';
const message = 'Bonjour !' + Date.now();

const operations = ["add", "sub", "mul", "div"];

function createCalc(){
    const first = random.int(0,100);
    const second = random.int(0,1000);
    const query = "{ 'n1': "+first+", 'n2': "+second+"}";

    const operation = operations[random.int(0,3)];

    return [query, operation];
}

async function send() {
    // Connexion
    const connection = await amqplib.connect(rabbitmq_url);

    // Création du channel
    const channel = await connection.createChannel();

    await channel.assertExchange(exchange, "direct", { durable: false });

    const {query, operation} = createCalc();
    channel.publish(exchange, operation, Buffer.from(query));

    console.log("Message envoyé");

    // Fermeture de la connexion
    setTimeout(function () {
        connection.close();
        process.exit(0);
    }, 200);
}

send();