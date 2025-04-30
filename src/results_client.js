import amqplib from 'amqplib';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const rabbitmq_url = `amqp://${process.env.LOGIN}:${process.env.PASSWORD}@${process.env.URL}`;
const queue = 'results';

const connection = await amqplib.connect(rabbitmq_url);

async function receive_results() {
    const channel = await connection.createChannel();
    await channel.assertQueue(queue, { durable: true, autoDelete: false });

    channel.consume(queue, (msg) => {
        if (msg !== null) {
            console.log("Message reçu : ", msg.content.toString());
            const content = JSON.parse(msg.content.toString());
            
            // Afficher le résultat en fonction de l'opération
            console.log(`Résultat reçu: ${content.n1} ${content.op} ${content.n2} = ${content.result}`);
            
            // Confirmer le message
            channel.ack(msg);
        }
    });
    
    console.log(`En attente de résultats sur la queue "${queue}"...`);
}

receive_results();