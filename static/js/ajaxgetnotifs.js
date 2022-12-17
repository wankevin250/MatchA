$(document).ready(() => {
    getFriendInvites();
});

function getFriendInvites() {
    $.ajax({
        url: '/ajaxviewfriendinvites',
        type: 'GET',
        async: true,
        datatype: 'json',
        success: (response) => {
            let invites = JSON.parse(response);
            console.log(invites);
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function getChatInvites() {

}