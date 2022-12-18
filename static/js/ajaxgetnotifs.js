$(document).ready(() => {
    getFriendInvites();
});

function getFriendInvites() {
    $.ajax({
        url: '/ajaxviewfriendinvites',
        type: 'POST',
        async: true,
        datatype: 'json',
        success: (response) => {
            console.log(response);
            let invites = JSON.parse(response);
            console.log(invites);
            let target = $('#notificiations-friendinvites-target');
            invites.forEach(d => {
                let inviteDiv = document.createElement('div');
                let info = document.createElement('div');
                let actions = document.createElement('div');

                let username = document.createElement('h1');
                console.log(d.asker);
                username.innerText = d.asker.S;

                info.appendChild(username);

                let accept = document.createElement('button');
                accept.innerText = 'Accept'
                accept.onclick = () => {
                    acceptFriendInvite(d.asker.S);
                    inviteDiv.style.display = "none";
                };

                let reject = document.createElement('button');
                reject.innerText = 'Reject';
                reject.onclick = () => {
                    rejectFriendInvite(d.asker);
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

function rejectFriendInvite(asker) {
    $.ajax({
        url: '/ajaxrejectfriendinvite',
        type: 'POST',
        async: true,
        datatype: 'json',
        data: {
            asker: asker
        },
        success: (response) => {
            console.log(response);
        }, 
        error: (error) => {
            console.log(error);
        }
    });
}

function acceptFriendInvite(asker) {
    $.ajax({
        url: '/ajaxacceptfriendinvite',
        type: 'POST',
        async: true,
        datatype: 'json',
        data: {
            asker: asker
        },
        success: (response) => {
            console.log(response);
        }, 
        error: (error) => {
            console.log(error);
        }
    });
}

function getChatInvites() {

}