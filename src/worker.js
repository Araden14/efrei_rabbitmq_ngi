import amqplib from "amqplib";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const rabbitmq_url = `amqp://${process.env.LOGIN}:${process.env.PASSWORD}@${process.env.URL}`;
console.log(rabbitmq_url);
const calc = process.argv[2];
const queue = `${calc}_worker`;
const exchange = "AVG_operations";
const exchangeAll = "AVG_operations_all";
const routing_key = process.argv[2];
const results_queue = "results";
const operation = {
    add: "+",
    sub: "-",
    mul: "*",
    div: "/",
};

const connection = await amqplib.connect(rabbitmq_url);

async function receive() {
    const channel = await connection.createChannel();
    await channel.assertExchange(exchange, "direct", {
        durable: true,
        autoDelete: false,
    });
    await channel.assertExchange(exchangeAll, "fanout", {
        durable: true,
        autoDelete: false,
    });
    await channel.assertQueue(queue, { durable: true, autoDelete: false });
    await channel.assertQueue(results_queue, {
        durable: true,
        autoDelete: false,
    });
    await channel.bindQueue(queue, exchange, routing_key);
    await channel.bindQueue(queue, exchangeAll, "");

    channel.consume(queue, (msg) => {
        if (msg !== null) {
            console.log("Message reçu : ", msg.content.toString());
            const content = JSON.parse(
                msg.content.toString().replace(/'/g, '"')
            );
            console.log(
                `Requête ${operation[routing_key]} reçue : ${content.n1} ${operation[routing_key]} ${content.n2}`
            );

            if (routing_key === "div" && content.n2 === 0) {
                console.log("Division par zéro impossible");
                channel.ack(msg);
                return;
            }
            // Simuler un traitement long
            const waitTime = Math.floor(Math.random() * 10000) + 5000;

            setTimeout(() => {
                const result = {
                    n1: content.n1,
                    n2: content.n2,
                    op: routing_key,
                    result: eval(content.n1 + operation[calc] + content.n2),
                };
                console.log(result);
                channel.sendToQueue(
                    results_queue,
                    Buffer.from(JSON.stringify(result))
                );
                channel.ack(msg);
            }, waitTime);
        }
    });
}

receive();
