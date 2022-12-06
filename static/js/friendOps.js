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
            console.log(response);
            callback(null, response);
        },
        error: (error) => {
            console.log(error);
            callback(error, null);
        }
    })
}