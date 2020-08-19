const RP = require('request-promise');
const { promisify } = require("util");
const redis = require('redis');
const { execSync } = require('child_process');
const Shell = require('node-powershell');

const ps = new Shell({
    executionPolicy: 'Bypass',
    noProfile: true
})

let smembersAsync;
let saddAsync;

let error_count = 0;

let chat_ids = [];

let client;

function connect() {
    client = redis.createClient({
        host: 'localhost',
        port: 6379
    });
    smembersAsync = promisify(client.smembers).bind(client);
    saddAsync = promisify(client.sadd).bind(client);
}

async function run() {
    if (!client.connected) return;

    chat_ids = await smembersAsync('btc-tracker:chat_ids');

    try {
        error_count = 0;

        let res = await RP.get('https://blockchain.info/ticker')

        console.log(res);
        res = JSON.parse(res);

        // console.log(res["USD"].last);

        let amount = res["USD"].last;

        // execSync(`osascript -e 'display notification "$${amount}" with title "BTC now"'`);


        let text  = `BTC is ${amount} USD`;
        console.log("TEXT", text);
        ps.addCommand(`New-BurntToastNotification -Text ` + "\""+ text + "\"");

        await ps.invoke();
        
        let resultUpdate = await RP.get('https://api.telegram.org/bot1314209140:AAGoYkC6jNipcyHenjJGGvUVHekcC5iAT8s/getUpdates');

        resultUpdate = JSON.parse(resultUpdate);

        let requests = [];

        console.log(resultUpdate.result);

        if (true) {
            let result = chat_ids.concat(resultUpdate.result.map(r => {
                console.log(JSON.stringify(r));
                return r.message.chat.id;
            }))

            console.log(result);

            result.forEach(async chatId => {
                let chat_id = chatId;

                await saddAsync(`btc-tracker:chat_ids`, chat_id);

                console.log("Chat Id", chat_id);

                requests.push(
                    RP.post('https://api.telegram.org/bot1314209140:AAGoYkC6jNipcyHenjJGGvUVHekcC5iAT8s/sendMessage', {
                        body: {
                            chat_id,
                            text: `Current BTC price $${amount}`
                        },
                        json: true,
                    })
                )
            });
        }


        for (let i = 0; i < requests.length; i++) {
            let res = await requests[i];

            console.log(res);
        }

        // let newMessage = await RP.post('https://api.telegram.org/bot1314209140:AAGoYkC6jNipcyHenjJGGvUVHekcC5iAT8s/sendMessage', {
        //     body: {
        //         chat_id: '608597269',
        //         text: `Current BTC price $${amount}`
        //     },
        //     json: true,
        // });

        // console.log(newMessage);
    } catch (error) {
        console.error(error);
        console.error("Error count exceeded");
        error_count++;
        if (error_count >= 11) {
            execSync(`osascript -e 'display notification "Error count exceeded" with title "BTC Tracker"'`);
            process.exit(2);
        }
    }
}

setInterval(async () => {
    run();
}, 15 * 60 * 1000)

//1606456 CHAT_ID 608597269

//1314209140:AAGoYkC6jNipcyHenjJGGvUVHekcC5iAT8s //API KEY

const x = {
    "ok": true, "result":
        [{
            "update_id": 229217071,
            "message": {
                "message_id": 2, "from": { "id": 608597269, "is_bot": false, "first_name": "Manish", "last_name": "Singh", "username": "manishsingh10895", "language_code": "en" },
                "chat": { "id": 608597269, "first_name": "Manish", "last_name": "Singh", "username": "manishsingh10895", "type": "private" }, "date": 1596224170, "text": "Dssd"
            }
        }]
}

connect();

setTimeout(() => { run() }, 2000);