import random from "random";
import amqplib from "amqplib";
import dotenv from "dotenv";
import prompts from "prompts";

dotenv.config({ path: "../.env" });

const rabbitmq_url = `amqp://${process.env.LOGIN}:${process.env.PASSWORD}@${process.env.URL}`;
console.log(rabbitmq_url);
const exchange = "AVG_operations";
const exchangeAll = "AVG_operations_all";
let auto = true;

async function promptForMode() {
  const response = await prompts({
    type: 'select',
    name: 'mode',
    message: 'Choisissez le mode de fonctionnement',
    choices: [
      { title: 'Automatique', value: true },
      { title: 'Manuel', value: false }
    ]
  });
  
  return response.mode;
}

auto = await promptForMode();


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
    let operation, query
    if (auto) {
        [query, operation] = createCalc(operations);
    }
    else {
        try {
            // Choix de l'opé
            const operationResponse = await prompts({
                type: 'select',
                name: 'operation',
                message: 'Choisissez l\'opération à effectuer',
                choices: operations.map(op => ({ title: op, value: op }))
            });
            
            operation = operationResponse.operation;
            
            // Choix des valeurs
            const numbersResponse = await prompts([
                {
                    type: 'number',
                    name: 'n1',
                    message: 'Entrez la première valeur (n1)',
                    validate: value => value !== undefined ? true : 'Veuillez entrer un nombre valide'
                },
                {
                    type: 'number',
                    name: 'n2',
                    message: 'Entrez la deuxième valeur (n2)',
                    validate: value => value !== undefined ? true : 'Veuillez entrer un nombre valide'
                }
            ]);
            
            query = { n1: numbersResponse.n1, n2: numbersResponse.n2 };
        } catch (error) {
            console.error('Une erreur est survenue lors de la saisie:', error);
            return;
        }
    }

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

    channel.publish(exchangeAll, "", Buffer.from(JSON.stringify(query)));

    console.log("Message envoyé avec l'opération : all");

    return;
}

// Fonction pour envoyer des messages indéfiniment toutes les 5 secondes
function sendMessagesIndefinitely(exchange, exchangeAll, operations) {
    send(exchange, exchangeAll, operations).catch((err) =>
        console.error("Error sending message:", err)
    );

    setTimeout(sendMessagesIndefinitely, 3000, exchange, exchangeAll, operations);
}
if (auto) {
    sendMessagesIndefinitely(exchange, exchangeAll, operations);
}
else {
    // Fonction recursive pour le mode manuel
    async function manualMode() {
        await send(exchange, exchangeAll, operations);
        
        const continueResponse = await prompts({
            type: 'confirm',
            name: 'continue',
            message: 'Voulez-vous envoyer un autre message?',
            initial: true
        });
        
        if (continueResponse.continue) {
            await manualMode();
        } else {
            console.log('Au revoir!');
            process.exit(0);
        }
    }
    manualMode();
}
