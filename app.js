const express = require('express');
const app = express();
const port = 3000;
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const {Keyboard} = require("puppeteer-keyboard");
puppeteer.use(StealthPlugin());
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function rangesleep(min, max) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
}

let reachedlimit;
let browser;
let page;
let page2;
let loginUsername = null;
const clients = [];
let config;
let delay;
let timesFailed = 0;

//Get Direct Messaging ID
let username = null;
let id = null;
let is_private = null;
let follower_count = null;
let pk = null;
let gotData = false



//https://www.instagram.com/accounts/suspended/?
const suspendedResponseHandler = async (response) => {
    const url = response.url();
    if (url.includes('https://www.instagram.com/accounts/suspended/')) {
        sendDataToAllClients('log | Account Suspended 💀 | serious')
        await browser.close();
        config = await loadConfig();
        config['exhausted'][config['next']] = 1;
        if (config['next']+1 === Object.keys(config['accounts']).length) {
            config['next'] = 0;
        } else {
            config['next'] += 1;
        }
        config['cookiesLogin'][config.next] = false;
        config['browser'] = false;
        config['running'] = false;
        await page.deleteCookie();
        await page2.deleteCookie();
        fs.writeFile('./config.json', JSON.stringify(config, null, 2));
    }
};

const scrapingWarningHandler1 = async (response) => {
    const url = response.url();
    if (url.includes('https://www.instagram.com/challenge')) {
        sendDataToAllClients('log | Scraping Warning ⚠️ | serious')
        await page.click('button');
    }
};

const scrapingWarningHandler2 = async (response) => {
    const url = response.url();
    if (url.includes('https://www.instagram.com/challenge')) {
        sendDataToAllClients('log | Scraping Warning ⚠️ | serious')
        await page2.click('button');
    }
};

// Event listener callback function
const IDresponseHandler = async (response) => {
  const url = response.url();
  if (url === 'https://www.instagram.com/graphql/query') {
    try {
      const responseBody = await response.json();
      if (responseBody.data.user){
        username = responseBody.data.user.username;
        id = responseBody.data.user.interop_messaging_user_fbid;
        is_private = responseBody.data.user.is_private;
        follower_count = responseBody.data.user.follower_count;
        pk = responseBody.data.user.pk;
        await page.off('response', IDresponseHandler);
        gotData = true;
      }
    } catch {
    }
  }
};

let msgfullName = null;
let msgusername = null;
let msgid = null;
let msgis_private = null;
let msgfollower_count = null;
let msgfollowing_count = null;

let users = [];
let msggotData = {};

const IDresponseHandler2 = async (response) => {
    const url = response.url();
    if (url.includes('https://www.instagram.com/graphql')) {
        try {
            const responseBody = await response.json();
            if (responseBody.data.user){
                msgfullName = responseBody.data.user.full_name;
                msgusername = responseBody.data.user.username;
                msgid = responseBody.data.user.interop_messaging_user_fbid;
                msgis_private = responseBody.data.user.is_private;
                msgfollower_count = responseBody.data.user.follower_count;
                msgfollowing_count = responseBody.data.user.following_count;
                msggotData[msgusername] = true;
                await page2.off('response', IDresponseHandler2);
            }
        } catch {
        }
    }
};

const FollowersResponseHandler = async (response) => {
    const url = response.url();
    if (url.includes(`https://www.instagram.com/api/v1/friendships/${pk}/`)){
    try {
        const responseBody = await response.json();
        if (responseBody.users){
        for (const user of responseBody.users) {
            users.push(user.username);
            msggotData[user.username] = false;
        }
        }
    } catch{}
    }
};


let rateLimited = false;
const MessageDelivery = async (response) => {
    const url = response.url();
    if (url.includes('https://www.instagram.com/ajax/bootloader-endpoint/?modules=LSUpdateSubscriptErrorMessage')){
        rateLimited = true;
    }
}

async function loadConfig(){
    const configStream = await fs.readFile("./config.json");
    const config = JSON.parse(configStream);
    return config;
}

app.get('/listen' , (req,res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.flushHeaders();
    clients.push(res);
    res.on('close', () => {
        clients.splice(clients.indexOf(res), 1);
        res.end()
    })
});

function sendDataToAllClients(data) {
    clients.forEach((res) => {
        res.write(`data: ${data}\n\n`);
    });
}

app.get('/dashboard', async (req, res) => {
    config = await loadConfig()
    if ( reachedlimit == null ){
        reachedlimit = config.limit;
    }

    delay = config.delay

    const data = {
        heading: 'InstaDM Dashboard',
        loginUsername: loginUsername,
        running: config.running,
        accounts: config.accounts,
        message: config.message,
        configBrowser : config.browser,
        targetUsername: config.targetUsername,
        limit: config.limit,
        targetFriendship: config.targetFriendship,
        count: String(reachedlimit) ,
        delay: config.delay,
        pvt: config.pvt
    };
    res.render('dash', data);
});

app.post('/loadPassword', async (req,res) => {
    config = await loadConfig();
    const username = req.body.username;
    let index = config.accounts.indexOf(username);
    const password = config.passwords[index];
    res.send(
        {
            password
        }
    )
})

app.post('/addAccount', async (req,res) => {
    config = await loadConfig();
    const username = req.body.username;
    const password = req.body.password;
    let outcome;
    if (!config.accounts.includes(username)){
        config.accounts.push(username);
        config.passwords.push(password);
        config.exhausted.push(0);
        config.cookiesLogin.push(false);
        fs.writeFile('./config.json', JSON.stringify(config, null, 2));
        outcome = 'success';
    }else{
        outcome = 'already exists'
    }
    res.send(
        {
            outcome
        }
    )
})

app.post('/editAccount', async (req,res) => {
    config = await loadConfig();
    const username = req.body.username;
    const password = req.body.password;
    const action = req.body.action;
    let outcome;
    if (action == 'Delete'){
        let index = config.accounts.indexOf(username);
        config.accounts.splice(index,1);
        config.passwords.splice(index,1);
        config.exhausted.splice(index,1);
        config.cookiesLogin.splice(index,1);
        config.next = 0 ;
        fs.writeFile('./config.json', JSON.stringify(config, null, 2));

        const savedCookies = await fs.readFile("./cookies.json");
        var scookies = JSON.parse(savedCookies);
        delete scookies[`${username}`]

        fs.writeFile('./cookies.json', JSON.stringify(scookies, null, 2));
        outcome = 'deleted';
    }else if (action == 'Edit'){
        let index = config.accounts.indexOf(username);
        config.passwords[index] = password;
        fs.writeFile('./config.json', JSON.stringify(config, null, 2));
        outcome = 'edited';
    }else{
        outcome = 'failed'
    }
    res.send(
        {
            outcome
        }
    )
})

async function loginInstagramFunc(autoStart = false){
    config = await loadConfig();
    try{
        if(config.accounts.length == 0){
            sendDataToAllClients('log | No Accounts Found 👤 | info');
            return;
        }

        if(config['browser'] == false){
            sendDataToAllClients(' disabled | loginInstagrambtn | true ');

            // Proxy Settings 
            /*
            const oldProxyUrl = 'http://104.167.28.54:3128'; 
            const newProxyUrl = await proxyChain.anonymizeProxy(oldProxyUrl);
            */

            browser = await puppeteer.launch({
                headless: true,
                //args: [`--proxy-server=${newProxyUrl}`]
            });

            page = await browser.newPage();
            page2 = await browser.newPage();
            await page.on("response", suspendedResponseHandler);
            await page2.on("response", suspendedResponseHandler);
            await page.bringToFront();
        }else{
            sendDataToAllClients('log | Session Exists Already 🤧 | info');
            return;
        }
    
        config['browser'] = true;
        fs.writeFile('./config.json', JSON.stringify(config, null, 2));
    
        sendDataToAllClients(' log | Session Started 🥷 | info ')
        //Go to Instagram and wait for Input to Load
        

        if ((config['cookiesLogin'][config.next])) {
            sendDataToAllClients(' log | Logging in with Cookies 🍪 | info ');
            const savedCookies = await fs.readFile("./cookies.json");
            const scookies = JSON.parse(savedCookies)[config.accounts[config.next]];
            await page.setCookie(...scookies);
            await page2.setCookie(...scookies);
            loginUsername = config['username'];
        }else{
            sendDataToAllClients(' log | Logging in 🥸 | info ')
            await page.goto('https://instagram.com', {timeout: 60000} );
            await page.waitForSelector('input[name=username]', { timeout: 60000 });

            while (config['exhausted'][config['next']] == 1){
                sendDataToAllClients(`log| Account ${config['accounts'][config['next']]} is exhausted 😫 | info`)
                if (config['next']+1 === Object.keys(config['accounts']).length) {
                    config['next'] = 0;
                    sendDataToAllClients(`log| All accounts are exhausted 😫 | info`)
                    throw new Error('All Accounts Exhausted');
                } else {
                    config['next'] += 1;
                    fs.writeFile('./config.json', JSON.stringify(config, null, 2));
                }
            }
            loginUsername = config['accounts'][config['next']]
            const password = config['passwords'][config['next']]
    
            //Input creds and wait for page to load
            if (config['cookiesLogin'][config.next]) {
                sendDataToAllClients(' log | Logging in with Cookies 🍪 | info ');
                const savedCookies = await fs.readFile("./cookies.json");
                const scookies = JSON.parse(savedCookies)[config.accounts[config.next]];
                await page.setCookie(...scookies);
                await page2.setCookie(...scookies);
                loginUsername = config['username'];
            }else{
                await rangesleep(1000,3000);
                await page.type('input[name=username]', loginUsername , {delay: 100});
                await page.type('input[name=password]', password, {delay: 100});
                await rangesleep(1000,3000);
                await page.click('button[type=submit]');

                await page.waitForResponse(response => response.url().includes('https://www.instagram.com/accounts/onetap/') , { timeout: 60000 });

                //save cookies
                sendDataToAllClients(' log | Saving Cookies 🍪 | info ')
                const savedCookies = await fs.readFile("./cookies.json");
                var scookies = JSON.parse(savedCookies);
                const cookies = await page.cookies();
                scookies[[config.accounts[config.next]]] = cookies;
                fs.writeFile('./cookies.json', JSON.stringify(scookies, null, 2));

            }
    
        }
        //change config
        config['username'] = loginUsername;
        config['cookiesLogin'][config.next] = true;
        fs.writeFile('./config.json', JSON.stringify(config, null, 2));
    
        // Remove Notification Modal
        sendDataToAllClients(' log | Removing Notification Modal 🧹 | info ')
    
        await page.goto('https://instagram.com/direct/',  {timeout: 60000})
        const close = await page.waitForSelector('button._a9--._ap36._a9_1');
        await close.click();
    }catch(err){
        console.error(err)
        sendDataToAllClients(' log | Something went wrong while Logging In 💀 | failed ');
        sendDataToAllClients(' disabled | loginInstagrambtn | false ');
        loginUsername = null;
        await browser.close();
        config['browser'] = false;
        fs.writeFile('./config.json', JSON.stringify(config, null, 2));
        return;
    }

    sendDataToAllClients(' log | Logged in 👏 | success ');
    sendDataToAllClients(`head | ${config.username} `);

    sendDataToAllClients(' disabled | logoutInstagrambtn | false ');
    sendDataToAllClients(' disabled | testInstagrambtn | false ');
    sendDataToAllClients(' disabled | startInstagrambtn | false ');

    if (autoStart){
        startInstagramFunc();
    }
}

app.post('/loginInstagram', async (req,res) => {
    loginInstagramFunc();
    let outcome = 'login started'
    res.send(
        {
            outcome
        }
    )
})


async function logoutInstagramFunc(){
    await browser.close();
    config = await loadConfig();
    config['browser'] = false;
    fs.writeFile('./config.json', JSON.stringify(config, null, 2));

    sendDataToAllClients(' log | Closed Session 🚮 | success ')
}

app.post('/logoutInstagram', async (req,res) => {
    logoutInstagramFunc();
    sendDataToAllClients(`head |  `);
    loginUsername = null;
    sendDataToAllClients(' disabled | loginInstagrambtn | false ');
    sendDataToAllClients(' disabled | logoutInstagrambtn | true ');
    sendDataToAllClients(' disabled | testInstagrambtn | true ');
    sendDataToAllClients(' disabled | startInstagrambtn | true ');
    let outcome = 'logout started'
    res.send(
        {
            outcome
        }
    )
})

app.post('/clearCookiesInstagram',async (req,res) => {
    config = await loadConfig();
    config.cookiesLogin[config.next] = false;
    fs.writeFile('./config.json', JSON.stringify(config, null, 2));
    let outcome = 'cleared cookies'
    res.send(
        {
            outcome
        }
    )
})

app.post('/clearExhaustedInstagram',async (req,res) => {
    config = await loadConfig();
    config.exhausted.forEach(function(part, index, theArray) {
        theArray[index] = 0;
    });
    fs.writeFile('./config.json', JSON.stringify(config, null, 2));
    let outcome = 'cleared exhausted'
    res.send(
        {
            outcome
        }
    )
})

app.post('/updateDmMessage', async (req,res) => {
    config = await loadConfig();
    config.message[req.body.index] = req.body.dmMessage.trim();
    fs.writeFile('./config.json', JSON.stringify(config, null, 2));
    let outcome = 'edited message'
    res.send(
        {
            outcome
        }
    )
})

app.post('/updatePvt', async (req,res) => {
    config = await loadConfig();
    config.pvt = req.body.pvt;
    fs.writeFile('./config.json', JSON.stringify(config, null, 2));
    let outcome = 'toggled private message'
    res.send(
        {
            outcome
        }
    )
})

app.post('/updateTargetUsername', async (req,res) => {
    config = await loadConfig();
    config.targetUsername = req.body.targetUsername.trim();
    fs.writeFile('./config.json', JSON.stringify(config, null, 2));
    let outcome = 'edited target username'
    res.send(
        {
            outcome
        }
    )
})

app.post('/updateDelay', async (req,res) => {
    config = await loadConfig();
    config.delay = Number(req.body.delay);
    if (req.body.delay == '' ){
        config.delay = 5;
    }
    delay = config.delay;
    fs.writeFile('./config.json', JSON.stringify(config, null, 2));
    let outcome = 'edited delay'
    res.send(
        {
            outcome
        }
    )
})

app.post('/updateLimit', async (req,res) => {
    config = await loadConfig();
    config.limit =  Number(req.body.limit);
    if (req.body.limit == ''){
        config.limit = null;
    }

    reachedlimit = config.limit;
        fs.writeFile('./config.json', JSON.stringify(config, null, 2));
        let outcome = 'edited limit'
        res.send(
            {
                outcome
            }
        )
        sendDataToAllClients(`count | ${reachedlimit}`)
})

app.post('/updateTargetFriendship', async (req,res) => {
    config = await loadConfig();
    config.targetFriendship =  req.body.targetFriendship.trim();
    fs.writeFile('./config.json', JSON.stringify(config, null, 2));
    let outcome = 'edited target friendship'
    res.send(
        {
            outcome
        }
    )
})

app.post('/resetCount', async (req,res) => {
    config = await loadConfig();
    reachedlimit = config.limit;
    let outcome = 'reseted count'
    res.send(
        {
            outcome
        }
    )
    sendDataToAllClients(`count | ${reachedlimit}`)
})

async function getMessage(){
    config = await loadConfig()
    dmMessage = config.message[(Math.floor(Math.random() * config.message.length))];
    while (dmMessage == ''){
        dmMessage = config.message[(Math.floor(Math.random() * config.message.length))];
    };
    return dmMessage;
}


async function testInstagramFunc(){
    config = await loadConfig();

    let tempMsg = '';

    for (const msg of config.message){
        if (msg != ""){
            tempMsg = msg
        }
    }

    if (tempMsg == ""){
        sendDataToAllClients('log | Add atleast one dm 📨 | info');
        return;
    }

    if (config.running){
        sendDataToAllClients('log | Running already 🤧 | info');
        return;
    }

    msgfullName = null;
    msgid = null;
    msgfollower_count = null;
    msgfollowing_count = null;
    msgis_private = null
    msgusername = null;

    config.running = true;
    fs.writeFile('./config.json', JSON.stringify(config, null, 2));

    sendDataToAllClients('disabled| testInstagrambtn  |true')
    sendDataToAllClients('disabled| startInstagrambtn |true')
    sendDataToAllClients('disabled| dm-message1 |true')
    sendDataToAllClients('disabled| dm-message2 |true')
    sendDataToAllClients('disabled| dm-message3 |true')
    sendDataToAllClients('disabled| dm-message4 |true')
    sendDataToAllClients('disabled| dm-message5 |true')
    sendDataToAllClients('disabled| delay |true')
    sendDataToAllClients('disabled| target-username |true')
    sendDataToAllClients('disabled| limit |true')
    sendDataToAllClients('disabled| target-friendship |true')

    await page.on("response", scrapingWarningHandler1)
    await page2.on("response", scrapingWarningHandler2)

    users = [];
    msggotData = {};

    try{
        const kb =  new Keyboard(page2) 

        users.push(loginUsername);
        msggotData[username] = false;
    
        await page2.bringToFront()
    
        for (const user of users) {
          await page2.on('response', IDresponseHandler2);
          await page2.goto(`https://instagram.com/${user}`);
    
          while (!(msggotData[user]) && msgid == null){
            await page2.on('response', IDresponseHandler2);
            await page2.goto(`https://instagram.com/${user}`);
            try{
                await page2.waitForResponse(response => response.url() === 'https://www.instagram.com/api/v1/web/fxcal/ig_sso_users/' , {timeout : 5000});
                await sleep(500);
            }
            catch{
            }
          }
        
          await page2.goto(`https://www.instagram.com/direct/t/${msgid}/`);
    
          try{
            await page2.waitForSelector('section', {timeout: 60000});
            const text = await page2.waitForSelector('p.xat24cr.xdj266r', { timeout: 60000 });
            await page2.on('response', MessageDelivery);
            dmMessage = await getMessage();
            dmMessage = dmMessage.replaceAll("\n","[Shift+Enter]")+'[Enter]';
            dmMessage = dmMessage.replaceAll('{fullname}',msgfullName);
            dmMessage = dmMessage.replaceAll('{username}',msgusername);
            dmMessage = dmMessage.replaceAll('{followers}',msgfollower_count);
            dmMessage = dmMessage.replaceAll('{following}',msgfollowing_count);
            
            await kb.type(dmMessage,text);
    
            try{
              await page2.waitForResponse(response => 
                response.url().includes('https://static.cdninstagram.com/rsrc.php/v3/yW'), { timeout: 60000 }
              );

              sendDataToAllClients(`log | DM'd ${user} ✅ | info `);
            }catch{
              sendDataToAllClients(`log | unable to verify if DM was sent to ${user} ❓ | info `);
            }
            await page2.off('response', MessageDelivery);
    
          }catch{
            sendDataToAllClients(`log | unable to DM ${user} ❌ | info `);
          }
    
          msgfullName = null;
          msgid = null;
          msgfollower_count = null;
          msgfollowing_count = null;
          msgis_private = null
          msgusername = null;
        };
        await page.bringToFront()
        users = [];
        msggotData = {};
    }catch{
        sendDataToAllClients('log | Something went wrong while Testing 💀 | failed ');
        browser.close();
        sendDataToAllClients('disabled| loginInstagrambtn  |false')
        sendDataToAllClients('disabled| dm-message1 |false')
        sendDataToAllClients('disabled| dm-message2 |false')
        sendDataToAllClients('disabled| dm-message3 |false')
        sendDataToAllClients('disabled| dm-message4 |false')
        sendDataToAllClients('disabled| dm-message5 |false')
        sendDataToAllClients('disabled| delay |false')
        sendDataToAllClients('disabled| target-username |false')
        sendDataToAllClients('disabled| limit |false')
        sendDataToAllClients('disabled| target-friendship |false')
        sendDataToAllClients('disabled| testInstagrambtn  |true')
        sendDataToAllClients('disabled| startInstagrambtn |true')
        sendDataToAllClients('disabled| logoutInstagrambtn  |true')
        loginUsername = null;
        config.browser = false;
        config.running = false;
        fs.writeFile('./config.json', JSON.stringify(config, null, 2));
        return;
    }

    config.running = false;
    fs.writeFile('./config.json', JSON.stringify(config, null, 2));
    sendDataToAllClients('disabled| testInstagrambtn  |false')
    sendDataToAllClients('disabled| startInstagrambtn |false')
    sendDataToAllClients('disabled| dm-message1 |false')
    sendDataToAllClients('disabled| dm-message2 |false')
    sendDataToAllClients('disabled| dm-message3 |false')
    sendDataToAllClients('disabled| dm-message4 |false')
    sendDataToAllClients('disabled| dm-message5 |false')
    sendDataToAllClients('disabled| delay |false')
    sendDataToAllClients('disabled| target-username |false')
    sendDataToAllClients('disabled| limit |false')
    sendDataToAllClients('disabled| target-friendship |false')

    await page.off("response", scrapingWarningHandler1)
    await page2.off("response", scrapingWarningHandler2)
}

app.post('/testInstagram', (req,res) => {
    sendDataToAllClients('log | Texting yourself | info')
    testInstagramFunc();
    let outcome = 'testing';
    res.send(
        {
            outcome
        }
    )
})


async function startInstagramFunc(){
    config = await loadConfig();
    sendDataToAllClients(`count | ${reachedlimit} `);
    let tempMsg = '';

    for (const msg of config.message){
        if (msg != ""){
            tempMsg = msg
        }
    }

    if (tempMsg == ""){
        sendDataToAllClients('log | Add atleast one dm 📨 | info');
        return;
    }

    if (config.running){
        sendDataToAllClients('log | Running already 🤧 | info');
        return;
    }

    if (config.targetUsername == ''){
        sendDataToAllClients('log | No target selected ⚔️ | info');
        return;
    }

    config.running = true;
    fs.writeFile('./config.json', JSON.stringify(config, null, 2));

    const usersDataStream = await fs.readFile("./users.json");
    const usersData = JSON.parse(usersDataStream);


    sendDataToAllClients('disabled| testInstagrambtn  |true')
    sendDataToAllClients('disabled| startInstagrambtn |true')
    sendDataToAllClients('disabled| dm-message1 |true')
    sendDataToAllClients('disabled| dm-message2 |true')
    sendDataToAllClients('disabled| dm-message3 |true')
    sendDataToAllClients('disabled| dm-message4 |true')
    sendDataToAllClients('disabled| dm-message5 |true')
    sendDataToAllClients('disabled| delay |true')
    sendDataToAllClients('disabled| target-username |true')
    sendDataToAllClients('disabled| limit |true')
    sendDataToAllClients('disabled| target-friendship |true')

    await page.on("response", scrapingWarningHandler1)
    await page2.on("response", scrapingWarningHandler2)

    timesFailed = 0;
    users = [];
    msggotData = {};

    try{

        await page.on('response', FollowersResponseHandler);
        await page.on('response', IDresponseHandler);

        await page.goto(`https://instagram.com/${config.targetUsername}`);
        
        while (!(gotData)){
            await page.on('response', IDresponseHandler);
            await page.goto(`https://instagram.com/${config.targetUsername}`);
            
            try{
                await page.waitForResponse(response => response.url() === 'https://www.instagram.com/api/v1/web/fxcal/ig_sso_users/' , {timeout : 5000});
                await sleep(500);
            }
            catch{
                //await page.reload()
            }
        }

        sendDataToAllClients('log | Detecting users 👤 | info ')
        // Click on Followers/Following
        await sleep(1000);
        const element = await page.$(".xc3tme8");
        const lis = await page.$$(".xl565be");
        for (let li of lis){
            const elem = await li.evaluate(el => el.textContent , li)

            if (elem.endsWith(config.targetFriendship) ){
            await li.click();
            }
        }

        try{
            await page.waitForResponse(
            response => response.url().includes(`https://www.instagram.com/api/v1/friendships/show_many/`), { timeout: 60000 }
            );
        }catch{
            sendDataToAllClients('log | Could not detect users, Detecting more 👤 | info ')
        }

        await page.waitForSelector('.x1dm5mii', { timeout: 60000 })

        const kb =  new Keyboard(page2);
        let keepScrolling = true;

        while (keepScrolling) {
            await page2.bringToFront()
            for (const user of users) {
                if (usersData.users.includes(user)){
                    continue;
                }
                await page2.on('response', IDresponseHandler2);
                await page2.goto(`https://instagram.com/${user}`);
                
                while (!(msggotData[user]) && msgid == null){
                    await page2.on('response', IDresponseHandler2);
                    await page2.goto(`https://instagram.com/${user}`);
                    try{
                        await page2.waitForResponse(response => response.url() === 'https://www.instagram.com/api/v1/web/fxcal/ig_sso_users/', {timeout : 5000});
                        await sleep(500);
                    }
                    catch{
                    }
                }
                
                if (config.pvt == false){
                    if (msgis_private == true){
                        sendDataToAllClients(`log| @${msgusername} Private Account 🔒  |info`);
                        msgfullName = null;
                        msgid = null;
                        msgfollower_count = null;
                        msgfollowing_count = null;
                        msgis_private = null
                        msgusername = null;
                        continue;
                    }
                }

                await page2.goto(`https://www.instagram.com/direct/t/${msgid}/`);
        
                try{
                    await page2.waitForSelector('section', {timeout: 60000});
                    const text = await page2.waitForSelector('p.xat24cr.xdj266r', { timeout: 60000 });
                    await page2.on('response', MessageDelivery);
                    dmMessage = await getMessage();
                    dmMessage = dmMessage.replaceAll("\n","[Shift+Enter]")+'[Enter]';
                    dmMessage = dmMessage.replaceAll('{fullname}',msgfullName);
                    dmMessage = dmMessage.replaceAll('{username}',msgusername);
                    dmMessage = dmMessage.replaceAll('{followers}',msgfollower_count);
                    dmMessage = dmMessage.replaceAll('{following}',msgfollowing_count);
                    
                    await kb.type(dmMessage,text)
            
                    try{
                        await page2.waitForResponse(response => 
                        response.url().includes('https://static.cdninstagram.com/rsrc.php/v3/yW'), { timeout: 60000 }
                        );
                        await sleep(500);
                        if (!rateLimited){
                            timesFailed = 0;
                            //write in users
                            usersData['users'].push(msgusername);
                            await fs.writeFile('./users.json', JSON.stringify( usersData, null, 2));
                            sendDataToAllClients(`log | DM'd @${user} ✅ | info `);
                            if (reachedlimit != null){
                                reachedlimit -= 1;
                                sendDataToAllClients(`count | ${reachedlimit}`)

                                if (reachedlimit <= 0){
                                    reachedlimit = 0;
                                    sendDataToAllClients(`log| Texted users according to limit set by you ✅  |success`)
                                    await page.bringToFront()
                                    config.running = false;

                                    msgfullName = null;
                                    msgid = null;
                                    msgfollower_count = null;
                                    msgfollowing_count = null;
                                    msgis_private = null
                                    msgusername = null;

                                    fs.writeFile('./config.json', JSON.stringify(config, null, 2));
                                    sendDataToAllClients('disabled| testInstagrambtn  |false')
                                    sendDataToAllClients('disabled| startInstagrambtn |false')
                                    sendDataToAllClients('disabled| dm-message1 |false')
                                    sendDataToAllClients('disabled| dm-message2 |false')
                                    sendDataToAllClients('disabled| dm-message3 |false')
                                    sendDataToAllClients('disabled| dm-message4 |false')
                                    sendDataToAllClients('disabled| dm-message5 |false')
                                    sendDataToAllClients('disabled| delay |false')
                                    sendDataToAllClients('disabled| target-username |false')
                                    sendDataToAllClients('disabled| limit |false')
                                    sendDataToAllClients('disabled| target-friendship |false')
                                    return;
                                }
                            }
                            await sleep(delay*1000);
                        }else{
                            if (timesFailed == 5){ //fail threshold 5
                                //write in users
                                //usersData['users'].push(msgusername);
                                //await fs.writeFile('./users.json', JSON.stringify( usersData, null, 2));
                                sendDataToAllClients('log | Account rate limited 🛑 | failed')
                                await sleep(delay*1000);
                                await page.deleteCookie();
                                await page2.deleteCookie();
                                config['cookiesLogin'][config.next] = false;
                                config['exhausted'][config['next']] = 1;
                                if (config['next']+1 === Object.keys(config['accounts']).length) {
                                    config['next'] = 0;
                                } else {
                                    config['next'] += 1;
                                }
                                await fs.writeFile('./config.json', JSON.stringify(config, null, 2));
                                browser.close()
                                sendDataToAllClients('disabled| loginInstagrambtn  |false')
                                sendDataToAllClients('disabled| dm-message1 |false')
                                sendDataToAllClients('disabled| dm-message2 |false')
                                sendDataToAllClients('disabled| dm-message3 |false')
                                sendDataToAllClients('disabled| dm-message4 |false')
                                sendDataToAllClients('disabled| dm-message5 |false')
                                sendDataToAllClients('disabled| delay |false')
                                sendDataToAllClients('disabled| target-username |false')
                                sendDataToAllClients('disabled| limit |false')
                                sendDataToAllClients('disabled| target-friendship |false')
                                sendDataToAllClients('disabled| testInstagrambtn  |true')
                                sendDataToAllClients('disabled| startInstagrambtn |true')
                                sendDataToAllClients('disabled| logoutInstagrambtn  |true')
                                loginUsername = null;
                                config.browser = false;
                                config.running = false;
                                fs.writeFile('./config.json', JSON.stringify(config, null, 2));

                                if (reachedlimit != 0){
                                    loginInstagramFunc(autoStart=true);
                                }

                                users = [];
                                msggotData = {};
                                
                                timesFailed = 0;
                                return;
                                //process.exit(0);  
                            }else {
                                rateLimited = false;
                                timesFailed += 1;
                                //write in users
                                //usersData['users'].push(msgusername);
                                //await fs.writeFile('./users.json', JSON.stringify( usersData, null, 2));
                                sendDataToAllClients(`log | unable to DM @${user} ❌ | info `);
                                await sleep(delay*1000);
                            }
                        }
                    }catch{
                        sendDataToAllClients(`log | unable to verify if DM was sent to @${user} ❓ | info `);
                    }
                    await page2.off('response', MessageDelivery);
            
                }catch{
                    //write in users
                    //usersData['users'].push(msgusername);
                    //await fs.writeFile('./users.json', JSON.stringify( usersData, null, 2));
                    sendDataToAllClients(`log | unable to DM @${user} ❌ | info `);
                    await sleep(delay*1000);
                }
        
                msgfullName = null;
                msgid = null;
                msgfollower_count = null;
                msgfollowing_count = null;
                msgis_private = null
                msgusername = null;
            };

            await page.bringToFront()

            await sleep(3000);

            users = [];
            msggotData = {};
            
            sendDataToAllClients('log | Loading more users 👤 | info');
            const sectionHandle = await page.$('.xyi19xy');
            const elems = await sectionHandle.$$('div');
            //await sleep(1000);
            await elems[elems.length - 1].scrollIntoView();
            //await sleep(1000);
        
            try {
                await page.waitForResponse(response => response.url().includes('https://www.instagram.com/api/v1/friendships/show_many/'), { timeout: 60000 });
                sendDataToAllClients('log | Found more users 👤 | info');
            } catch (err) {
                sendDataToAllClients('log | No more users detected 👤 | info')
                await page.bringToFront()
                keepScrolling = false;
            }
        }

    }catch{
        sendDataToAllClients("log | Something went wrong while DM'ing 💀 | failed ");
        browser.close();
        sendDataToAllClients('disabled| loginInstagrambtn  |false')
        sendDataToAllClients('disabled| dm-message1 |false')
        sendDataToAllClients('disabled| dm-message2 |false')
        sendDataToAllClients('disabled| dm-message3 |false')
        sendDataToAllClients('disabled| dm-message4 |false')
        sendDataToAllClients('disabled| dm-message5 |false')
        sendDataToAllClients('disabled| delay |false')
        sendDataToAllClients('disabled| target-username |false')
        sendDataToAllClients('disabled| limit |false')
        sendDataToAllClients('disabled| target-friendship |false')
        sendDataToAllClients('disabled| testInstagrambtn  |true')
        sendDataToAllClients('disabled| startInstagrambtn |true')
        sendDataToAllClients('disabled| logoutInstagrambtn  |true')
        loginUsername = null;
        config.browser = false;
        config.running = false;
        fs.writeFile('./config.json', JSON.stringify(config, null, 2));
        return;
    }
    await page.bringToFront()
    config.running = false;
    fs.writeFile('./config.json', JSON.stringify(config, null, 2));
    sendDataToAllClients('disabled| testInstagrambtn  |false')
    sendDataToAllClients('disabled| startInstagrambtn |false')
    sendDataToAllClients('disabled| dm-message1 |false')
    sendDataToAllClients('disabled| dm-message2 |false')
    sendDataToAllClients('disabled| dm-message3 |false')
    sendDataToAllClients('disabled| dm-message4 |false')
    sendDataToAllClients('disabled| dm-message5 |false')
    sendDataToAllClients('disabled| delay |false')
    sendDataToAllClients('disabled| target-username |false')
    sendDataToAllClients('disabled| limit |false')
    sendDataToAllClients('disabled| target-friendship |false')

    await page.off("response", scrapingWarningHandler1)
    await page2.off("response", scrapingWarningHandler2)
    
}

app.post('/startInstagram', (req,res) => {
    sendDataToAllClients('log | Starting Sending DM\'s | info')
    startInstagramFunc()
    let outcome = 'starting';
    res.send(
        {
            outcome
        }
    )
})

async function captureScreenInstagramFunc(){
    sendDataToAllClients(' disabled | captureScreenInstagrambtn | true ');
    sendDataToAllClients('log | Capturing Screen 📸 | info');
    await page.screenshot({path:'public/screen1.jpg'});
    await page2.screenshot({path:'public/screen2.jpg'});
    await page.bringToFront();
    sendDataToAllClients('log | View here <a target="_blank" href="/screen1.jpg">Screen 1</a>, <a target="_blank" href="/screen2.jpg">Screen 2</a> 👀 | info');
    sendDataToAllClients(' disabled | captureScreenInstagrambtn | false ');
}

app.post('/captureScreenInstagram', (req,res) => {
    captureScreenInstagramFunc()
    let outcome = 'capturing';
    res.send(
        {
            outcome
        }
    )
})

app.listen(port, async () => {
    config = await loadConfig()
    config.browser = false;
    config.running = false;
    fs.writeFile('./config.json', JSON.stringify(config, null, 2));
    console.log(`Server is running at http://localhost:${port}`);
});


