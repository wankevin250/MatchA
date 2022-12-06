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
            let results = JSON.parse(response);
            
            let resultsDiv = document.createElement('div');
            results.forEach(d => {
                let userWrapper = document.createElement('div');

                let userResult = document.createElement('div');
                let userDisplayName = document.createElement('h3');
                let userUserName = document.createElement('p');

                let userAddFriendButton = document.createElement('button');
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
                };

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