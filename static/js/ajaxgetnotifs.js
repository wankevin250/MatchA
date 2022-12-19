$(document).ready(() => {
    getInvites();
});

function getInvites() {
    $.ajax({
        url: '/ajaxviewinvites',
        type: 'POST',
        async: true,
        datatype: 'json',
        success: (response) => {
            console.log(response);
            let invites = response && response.length > 0 
                ? JSON.parse(response) : [];
            let target = $('#notificiations-friendinvites-target');
            invites.forEach(d => {
                let inviteDiv = document.createElement('div');
                let info = document.createElement('div');
                let actions = document.createElement('div');

                let username = document.createElement('h1');
                username.innerText = d.asker;

                let typename = document.createElement('p');
                typename.innerText = `Request ${d.type}`;

                info.appendChild(username);
                info.appendChild(typename);

                let accept = document.createElement('button');
                accept.innerText = 'Accept'
                accept.onclick = () => {
                    processInvite(d.asker, d.type, true);
                    inviteDiv.style.display = "none";
                };

                let reject = document.createElement('button');
                reject.innerText = 'Reject';
                reject.onclick = () => {
                    rejectFriendInvite(d.asker, d.type, false);
                    inviteDiv.style.display = "none";
                };
                
                actions.appendChild(accept);
                actions.appendChild(reject); 

                inviteDiv.appendChild(info);
                inviteDiv.appendChild(actions);

                target.append(inviteDiv);
            });
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function processInvite(asker, type, acceptance) {
    $.ajax({
        url: '/handlerequest',
        type: 'POST',
        async: true,
        datatype: 'json',
        data: {
            askerid: asker,
            type: type,
            acceptance: acceptance,
        },
        success: (response) => {
            console.log(response);
        },
        error: (error) => {
            console.log(error);
        }
    });
}
