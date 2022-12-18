$(document).ready(() => {
    searchUser($('#search-query').text());
});

function searchUser(query) {
    $.ajax({
        url: '/ajaxsearchuser',
        type: 'POST',
        async: true,
        datatype: 'json',
        data: {
            query: query
        },
        success: (response) => {
            console.log(JSON.parse(response));
            let [results, user] = JSON.parse(response);

            console.log(JSON.parse(response));

            let requests = JSON.parse(user.sentRequests);
            let friends = JSON.parse(user.friends);
            
            let resultsDiv = document.createElement('div');
            results.forEach(d => {
                let userResult = document.createElement('div');
                let userDisplayName = document.createElement('h3');
                let userUserName = document.createElement('p');

                let userAddFriendButton = document.createElement('button');
                if (friends && friends.includes(d.username)) {
                    userAddFriendButton.disabled = true;
                    userAddFriendButton.innerText = "Friends";
                } else if (requests && requests.includes(d.username)) {
                    userAddFriendButton.disabled = true;
                    userAddFriendButton.innerText = "Request Sent";
                } else {
                    userAddFriendButton.innerText = `Add Friend`;
                    userAddFriendButton.onclick = () => {
                        console.log(d.username);
                        addFriend(d.username, (err, response) => {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log(response);
                            }
                        });
                        userAddFriendButton.disabled = true;
                        userAddFriendButton.innerText = 'Request Sent';
                        console.log(userAddFriendButton.disabled);
                    };
                }
                
                userDisplayName.innerText = d.displayname;
                userUserName.innerText = '@' + d.username;

                userResult.appendChild(userDisplayName);
                userResult.appendChild(userUserName);

                resultsDiv.appendChild(userResult);
                resultsDiv.appendChild(userAddFriendButton);
            });

            $('#search-results-target').append(resultsDiv);


        },
        error: (error) => {
            console.log(error);
            // tell error if search
        }
    })
}