import random from "random";
import amqplib from "amqplib";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const rabbitmq_url = `amqp://${process.env.USERNAME}:${process.env.PASSWORD}@${process.env.URL}`;
const exchange = "AVG_operations";
const exchangeAll = "AVG_operations_all";

const operations = ["add", "sub", "mul", "div", "all"];

function createCalc(operations) {
    const first = random.int(0, 100);
    const second = random.int(0, 1000);
    const query = { n1: first, n2: second };

    const operation = operations[random.int(0, 4)];

    return [query, operation];
}

async function send(exchange, exchangeAll, operations) {
    // Connexion
    const connection = await amqplib.connect(rabbitmq_url);

    // Création du channel
    const channel = await connection.createChannel();

    const [query, operation] = createCalc(operations);

    if (operation != "all") {
        await channel.assertExchange(exchange, "direct", {
            durable: true,
            autoDelete: false,
        });

        channel.publish(
            exchange,
            operation,
            Buffer.from(JSON.stringify(query))
        );

        console.log("Message envoyé avec l'opération : ", operation);

        return;
    }

    await channel.assertExchange(exchangeAll, "fanout", { durable: true });

    channel.publish(exchange, "", Buffer.from(JSON.stringify(query)));

    console.log("Message envoyé avec l'opération : all");

    return;
}

// Fonction pour envoyer des messages indéfiniment toutes les 5 secondes
function sendMessagesIndefinitely(exchange, exchangeAll, operations) {
    send(exchange, exchangeAll, operations).catch((err) =>
        console.error("Error sending message:", err)
    );

    setTimeout(sendMessagesIndefinitely, 3000);
}
sendMessagesIndefinitely(exchange, exchangeAll, operations);
