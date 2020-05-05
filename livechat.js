//https
const fs = require('fs');
const key = fs.readFileSync('C:/Users/Admin/key.pem');
const cert = fs.readFileSync('C:/Users/Admin/cert.pem');
const https = require('https');


const express = require('express');
const fetch = require('node-fetch');
const querystring = require('querystring');

const app = express();

const config = {
    api_key: '91c64f738cfa413888c26f3a1a7fddaa',
    secret_key: 'b3d7d34e69ba46c1bb9040e216e2916b',
    redirect_uri: 'https://localhost:8084/install',
    scopes: 'read_script_tags,write_script_tags'
};

app.use(express.urlencoded({
    extended: true
}));

app.use(express.static(__dirname + '\\public'));


app.get('/login/', (request, response) => {
    const store = request.query.store;
    const url = `https://${store}/admin/oauth/authorize?client_id=${config.api_key}&scope=${config.scopes}&redirect_uri=${config.redirect_uri}`;
    response.writeHead(301, {
        Location: url
    });
    response.end();
});


app.get('/install/', (request, response) => {
    const code = request.query.code;
    const store = request.query.store;
    const url = `https://${store}/admin/oauth/access_token`;

    const headers = new fetch.Headers();
    headers.append("Content-Type", "application/json");

    const body = JSON.stringify({
        "client_id": config.api_key,
        "client_secret": config.secret_key,
        "code": code
    });

    fetch(url, {
        method: 'POST',
        headers: headers,
        body: body
    })
        .then(res => res.json())
        .then(data => {
            console.log(data);
            const queryStringEncoded = querystring.escape(`https://localhost:8084/validate?access_token=${data.access_token}&store=${store}`);
            const destinationURL = `https://livechat.oncustomer.asia/integration?uri=${queryStringEncoded}`;

            response.writeHead(301, {
                Location: destinationURL
            });
            response.end();
        })
        .catch(error => {
            response.json(error);
        });
});

app.get('/activate/', (request, response) => {
    const access_token = request.query.access_token;
    const store = request.query.store;

    const html = `<a href="https://localhost:8084/validate?access_token=${access_token}&livechat_token=3bafd8ac4537f01d51027d1e30b00eb2&store=${store}">Activate</a>`;
    response.write(html);
    response.end();
});

app.get('/validate/', (request, response) => {
    const access_token = request.query.access_token;
    const store = request.query.store;
    const livechat_token = request.query.livechat_token;

    console.log(access_token, store, livechat_token);

    const headers = new fetch.Headers();
    headers.append("Content-Type", "application/json");
    headers.append("X-Sapo-Access-Token", access_token);

    const body = JSON.stringify({
        "script_tag": {
            "src": "https://lqaxx7799.github.io/livechat-script.js?token=" + livechat_token,
            "event": "onload"
        }
    });

    fetch(`https://${store}/admin/script_tags.json`, {
        headers: headers
    })
        .then(res => res.json())
        .then(data => {
            const filteredData = data['script_tags'].filter(x => x.src.includes("https://lqaxx7799.github.io/livechat-script.js"));

            Promise.all(filteredData.map(tag => {
                return fetch(`https://${store}/admin/script_tags/${tag.id}.json`, {
                    method: 'DELETE',
                    headers: headers
                });
            }))
                .then(result => {

                    fetch(`https://${store}/admin/script_tags.json`, {
                        method: 'POST',
                        headers: headers,
                        body: body
                    })
                        .then(res => res.json())
                        .then(result => {
                            const html = `
                                <link rel="stylesheet" type="text/css" href="/css/livechat.css" />
                                <div class="livechat-wrapper">
                                    <div class="livechat-content"><img class="livechat-logo" src="/images/logo.png" /></div>
                                    <div class="livechat-content">
                                        Kết nối ứng dụng với ứng dụng OnCustomer Livechat<br/>
                                        để bắt đầu chăm sóc khách hàng của bạn trên website.
                                    </div>
                                    <div class="livechat-content">
                                        <img class="livechat-icon" src="/images/check.png" />
                                        Bạn đã kết nối thành công với OnCustomer Livechat.
                                    </div>
                                    <div class="livechat-content">
                                        <a href="https://livechat.oncustomer.asia" target="_blank" class="livechat-button-outline">Dashboard</a>
                                    </div>
                                </div>
                            `;
                            response.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});  
                            response.write(html);
                            response.end();
                        })
                        .catch(error => response.json({ 'errorFetch': error }));
                });
        });

});

// const server = app.listen(8084, () => {
//     console.log('listening at 8084');
// });


//https
const server = https.createServer({ key: key, cert: cert }, app);
server.listen(8084, () => {
    console.log('listening on 8084');
});
