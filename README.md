# InstaDM

<img alt='demo' src='https://raw.githubusercontent.com/Sebastian09-09/InstaDM/refs/heads/main/demo.gif' width = '300px'>

An instagram bot to send cold dms to your target users followers or following list 📨
- helps you reach new target audience 👥
- convert more leads 🔁
- highly flexible 〰️
- undetectable 🤖
 
## Setup
- Install node.js ver v20.11.1
- run `npm install express puppeteer-extra puppeteer-extra-plugin-stealth fs puppeteer-keyboard`
- run `node app.js`
- visit localhost:3000/dashboard 

## How to Use ?
- make sure your instagram account does not have 2-factor authentication
- add your instagram accounts (username and password)
- click on login 
- add atleast 1 messages in the message box (max 5)
- add target username , dm limit , delay and whom to target (followers/following)

## Flexibilty ?
### you can change :-
- delay between 2 dms
- how many accounts to dm
- accounts (supports multiple accounts , in case one reaches instagram dm limits)
- target list (followers / following )

## Functional 
- in case your accounts are exhausted , click on clear exhausted button
- accounts are marked as exhausted if they fail to dm 5 times consecutively 
- you can clear cookies to do new fresh logins 
- you can use {fullname} to type fullname of the account to be DM'd
- you can use {username} to type username of the account to be DM'd
- you can use {followers} to type the follower count of the account to be DM'd
- you can use {following} to type the following count of the account to be DM'd
