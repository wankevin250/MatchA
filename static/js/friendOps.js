function addFriend(username, callback) {
    console.log(username);
    $.ajax({
        url: 'ajaxaddfriend',
        type: 'POST',
        async: true,
        datatype: 'json',
        data: {
            accepter: username
        },
        success: (response) => {
            callback(null, response);
        },
        error: (error) => {
            callback(error, null);
        }
    })
}