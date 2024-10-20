function toggleConsole(){
    let consoleClass = document.getElementById('body').className;
    if (consoleClass == ''){
        document.getElementById('body').className = 'full-screen';
    }else{
        document.getElementById('body').className = '';
    }
}

async function loadPassword(){
    let username = document.getElementById('select-username').value;
    let response = await fetch("/loadPassword", {
        method: "POST",
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({'username': username})
    })
    .then(response => response.json());
    document.getElementById('select-password').value = response.password;
    document.getElementById('select-submit').value = 'Delete';
    document.getElementById('select-submit').innerHTML = 'Delete';
}

function loadEdit(){
    document.getElementById('select-submit').value = 'Edit';
    document.getElementById('select-submit').innerHTML = 'Edit';
}

async function addAccount(){
    let username = document.getElementById('add-username').value;
    let password = document.getElementById('add-password').value;
    let response = await fetch("/addAccount", {
        method: "POST",
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({'username': username,'password': password})
    })
    .then(response => response.json());
    document.getElementById('add-username').value = '';
    document.getElementById('add-password').value = '';
    if (response.outcome == 'success'){
        document.getElementById('select-username').innerHTML += `<option value="${username}" id="${username}">${username}</option>`;
    }
}

async function editAccount(){
    let username = document.getElementById('select-username').value;
    let password = document.getElementById('select-password').value;
    let action = document.getElementById('select-submit').value;
    let response = await fetch("/editAccount", {
        method: "POST",
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({'username': username,'password': password,'action':action})
    })
    .then(response => response.json());
    if (action == 'Delete'){
        document.getElementById('select-password').value = '';
        document.getElementById(username).disabled  = true;
        document.getElementById(username).style.display  = 'none';
        document.getElementById('select-username-default').selected  = true;
    }
}

function loginInstagram(){
    const loginInstagrambtn = document.getElementById('loginInstagrambtn');
    if (loginInstagrambtn.disabled){
        //already logged in
    }else{
        let response = fetch("/loginInstagram", {
            method: "POST",
            headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
            }
        })
        .then(response => response.json());
    }
};

function logoutInstagram(){
    const logoutInstagrambtn = document.getElementById('logoutInstagrambtn');
    if (logoutInstagrambtn.disabled){
        //already logged out
    }else{
        let response = fetch("/logoutInstagram", {
            method: "POST",
            headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
            }
        })
        .then(response => response.json());
    }
}

function clearCookiesInstagram(){
    let response = fetch("/clearCookiesInstagram", {
        method: "POST",
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())

}

function clearExhaustedInstagram(){
    let response = fetch("/clearExhaustedInstagram", {
        method: "POST",
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
}

function activateDMMessage(elem){
    activeElem = document.querySelector('#dm-message-container>textarea.dm-message-active.dm-message.dm-message-active');
    activeElem.className = 'dm-message';
    elem.className += ' dm-message-active';
}

function updateDmMessage(this_,index){
    const dmMessage = this_.value;
    let response = fetch("/updateDmMessage", {
        method: "POST",
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({'dmMessage': dmMessage, 'index': index})
    })
    .then(response => response.json())
}

function updateTargetUsername(){
    const targetUsername = document.getElementById('target-username').value;
    let response = fetch("/updateTargetUsername", {
        method: "POST",
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({'targetUsername': targetUsername})
    })
    .then(response => response.json())
}

function updateDelay(){
    const delay = document.getElementById('delay').value;
    let response = fetch("/updateDelay", {
        method: "POST",
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({'delay': delay})
    })
    .then(response => response.json())
}

function updateLimit(){
    const limit = document.getElementById('limit').value;
    let response = fetch("/updateLimit", {
        method: "POST",
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({'limit': limit})
    })
    .then(response => response.json())
}

function updateTargetFriendship(){
    const targetFriendship = document.getElementById('target-friendship').value;
    let response = fetch("/updateTargetFriendship", {
        method: "POST",
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({'targetFriendship': targetFriendship})
    })
    .then(response => response.json())
}

function resetCount(){
    let response = fetch("/resetCount", {
        method: "POST",
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
    })
    .then(response => response.json())
}

function testInstagram(){
    let response = fetch("/testInstagram", {
        method: "POST",
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
}

function startInstagram(){
    let response = fetch("/startInstagram", {
        method: "POST",
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
}

function captureScreenInstagram(){
    let response = fetch("/captureScreenInstagram", {
        method: "POST",
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
}

function updatePvt(){
    const pvt = document.getElementById('pvt').checked;
    let response = fetch("/updatePvt", {
        method: "POST",
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({'pvt': pvt})
    })
    .then(response => response.json())
}