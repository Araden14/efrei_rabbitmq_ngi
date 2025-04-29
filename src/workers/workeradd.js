import amqplib from 'amqplib';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });


const rabbitmq_url = `amqp://${process.env.USERNAME}:${process.env.PASSWORD}@${process.env.URL}`;

const queue = 'add_worker';


const connection = await amqplib.connect(rabbitmq_url);

async function receive_div() {
    const channel = await connection.createChannel();
    await channel.assertQueue(queue, { durable: true, autoDelete: false });

    channel.consume(queue, (msg) => {
        if (msg !== null) {
            const content = JSON.parse(msg.content.toString());
            console.log(`Requête d'addition reçue : ${content.n1} + ${content.n2}`);
            let result;
            // Simuler un traitement long
            const waitTime = Math.floor(Math.random() * 10000) + 5000;
            setTimeout(() => {
                result = { 
                    n1: content.n1,
                    n2: content.n2,
                    op: "div",
                    result: content.n1 + content.n2 };
            }, waitTime);
            console.log(`Résultat de la division ? ${JSON.stringify(result)}`);
            
            channel.ack(msg);
        }
    });
}
