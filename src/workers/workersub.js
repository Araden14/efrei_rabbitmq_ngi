import amqplib from 'amqplib';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });


const rabbitmq_url = `amqp://${process.env.USERNAME}:${process.env.PASSWORD}@${process.env.URL}`;
const queue = 'sub_worker';
const results_queue = "results"


const connection = await amqplib.connect(rabbitmq_url);

async function receive_div() {
    const channel = await connection.createChannel();
    await channel.assertQueue(queue, { durable: true, autoDelete: false });
    await channel.assertQueue(results_queue, { durable: true, autoDelete: false})

    channel.consume(queue, (msg) => {
        if (msg !== null) {
            console.log("Message reçu : ", msg.content.toString());
            const content = JSON.parse(msg.content.toString().replace(/'/g, '"'));
            console.log(`Requête de soustraction reçue : ${content.n1} - ${content.n2}`);
            
            // Simuler un traitement long
            const waitTime = Math.floor(Math.random() * 10000) + 5000;
            
            setTimeout(() => {
                const result = { 
                    n1: content.n1,
                    n2: content.n2,
                    op: "sub",
                    result: content.n1 - content.n2 
                };
                console.log(result);
                channel.sendToQueue(results_queue, Buffer.from(JSON.stringify(result)));
                channel.ack(msg);
            }, waitTime);
        }
    });
}

receive_div();