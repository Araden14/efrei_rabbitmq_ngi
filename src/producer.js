const amqplib = require('amqplib');
import random from 'random';

const rabbitmq_url = 'amqp://'+process.env.USER+':'+process.env.PASSWORD+'@'+process.env.URL;
const exchange = 'AVG_project_calc_exchange';
const message = 'Bonjour !' + Date.now();

const operations = ["add", "sub", "mul", "div"];

function createCalc(){
    const first = random.int((min = 0), (max = 100));
    const second = random.int((min = 0), (max = 100));
    const query = "{ 'n1': "+first+", 'n2': "+second+"}";

    const operation = operations[random.int((min = 0), (max = 3))];

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