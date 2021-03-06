const RP = require('request-promise');
const { promisify } = require("util");
const redis = require('redis');
const { execSync } = require('child_process');
// const Shell = require('node-powershell');

// const ps = new Shell({
//     executionPolicy: 'Bypass',
//     noProfile: true
// })

const COIN_MARKET_API = '3b45cf0b-072c-4bca-8586-1197078dd69e';
const COIN_APIS = [
    '83E59ECE-AA30-42CE-B3BF-F475F56B0CFF',
    'F117D5F2-F5CD-4297-88D1-374392BD56AC',
    'EDF31945-3C23-47FA-A156-92A6CAB03609'
];

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

async function zebpayAmount() {
    try {
        let res = await RP.get(`https://www.zebapi.com/pro/v1/market/`);
        res = JSON.parse(res);
        let btc = res.find(x => x.pair == "BTC-INR");
        let eth = res.find(x => x.pair == "ETH-INR");
        let matic = res.find(x => x.pair == "MATIC-INR");
        let bnb = res.find(x => x.pair == "BNB-INR");

        let btcAmount = btc.sell;
        let ethAmount = eth.sell;
        let maticAmount = matic.sell;
        let bnbAmount = bnb.sell;

        return {
            zBTC: btcAmount,
            zETH: ethAmount,
            zMatic: maticAmount,
            zBNB: bnbAmount
        }
    } catch (error) {
        console.error("Error in zebpay api");
        console.error(error);
    }
}

async function run() {
    if (!client.connected) return;

    chat_ids = await smembersAsync('btc-tracker:chat_ids');

    try {
        error_count = 0;
        let index = Math.floor((Math.random() * COIN_APIS.length) + 0);
        let res = await RP.get(`https://rest.coinapi.io/v1/assets?apiKey=${COIN_APIS[index]}`);

        res = JSON.parse(res);

        // console.log(res["USD"].last);

        let assets = res;

        let btc = assets.find(x => x.asset_id == "BTC");
        let eth = assets.find(x => x.asset_id == "ETH");

        let amount = parseFloat(btc.price_usd).toFixed(2);
        let ethAmount = parseFloat(eth.price_usd).toFixed(2);

        // execSync(`osascript -e 'display notification "$${amount}" with title "BTC now"'`);

        let text = `BTC is ${amount} USD`;
        console.log("TEXT", text);
        // ps.addCommand(`New-BurntToastNotification -Text ` + "\""+ text + "\"");

        // await ps.invoke();

        let resultUpdate = await RP.get('https://api.telegram.org/bot1314209140:AAGoYkC6jNipcyHenjJGGvUVHekcC5iAT8s/getUpdates');

        resultUpdate = JSON.parse(resultUpdate);

        let requests = [];

        console.log(resultUpdate.result);

        const { zBTC, zETH, zBNB, zMatic } = await zebpayAmount();

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
                            text: `MATIC ₹${zMatic}
Zeb BTC ₹${zBTC}
BNB ₹${zBNB}
Zeb ETH ₹${zETH}
BTC $${amount} 
ETH price $${ethAmount}`
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
}, 8 * 60 * 1000)

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