const amqplib = require('amqplib');

const rabbitmq_url = 'amqp://'+process.env.USER+':'+process.env.PASSWORD+'@'+process.env.URL;
const queue = 'AVG_project_calc_query';
const message = 'Bonjour !' + Date.now();

function createCalc(){
    const first = rand();
    const second = rand();
    const query = {
        "n1": first,
        "n2": second
    };

    return query;
}

async function send() {
    // Connexion
    const connection = await amqplib.connect(rabbitmq_url);
    
    // Création du channel
    const channel = await connection.createChannel();

    // Assertion sur l'existence de la queue
    await channel.assertQueue(queue, { durable: false });

    // Envoi du message
    channel.sendToQueue(queue, Buffer.from(message));

    console.log("Message envoyé !");

    // Fermeture de la connexion
    setTimeout(function() {
        connection.close();
        process.exit(0);
    }, 200);

}

send();