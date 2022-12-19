let userwall;
let posts = [];

$(document).ready(() => {
    userwall = $('#mywall-userwall-target').text();
    getPosts();
});

function newPosts(inputPosts) {
    let addPosts = inputPosts.filter(np => {
        let isIn = false;
        posts.forEach(p => {
            if (p.postuuid == np.postuuid) {
                isIn = true;
            }
        });
        return !isIn;
    });
    let sortedAddPosts = addPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    posts.unshift(...sortedAddPosts);
    return sortedAddPosts;
}

function sendPost() {
    let inputText = $('#mywall-inputtarget').val();
    if (inputText.length < 300 && inputText.length > 0) {
        $.ajax({
            url: '/ajaxpostmywall',
            type: 'POST',
            async: true,
            datatype: 'json',
            data: {
                userwall: userwall,
                text: inputText
            },
            success: (response) => {
                console.log(response);
                $('#mywall-inputtarget').val('');
                getPosts();
            },
            error: (error) => {
                console.log(error);
            }
        });
    } else {
        $('#mywall-errortarget').text("Error: post must not exceed 300 characters");
    }
}

function getPosts() {
    $.ajax({
        url: '/ajaxrefreshmywall',
        type: 'POST',
        async: true,
        datatype: 'json',
        data: {
            userwall: userwall,
        },
        success: (response) => {
            console.log(response);
            let postTarget = $('#mywall-post-target');
            let queriedPosts = response && response.length > 0
                ? JSON.parse(response) : [];
            
            let addPosts = newPosts(queriedPosts);

            let postNone = document.createElement('p');
            postNone.innerText = 'No posts';
            
            console.log(posts);

            if (posts.length < 1) {
                postTarget.append(postNone);
            } else {
                addPosts.forEach(d => {
                    let postContent = document.createElement('div');
                    postContent.className = "mywall-postcontent";

                    let poster = document.createElement('h1');
                    poster.innerText = d.poster;
                    poster.className = "mywall-postposter";
                    
                    let text = document.createElement('p');
                    text.innerText = d.text;
                    text.className = "mywall-posttext";

                    let time = document.createElement('p');
                    time.innerText = d.timestamp;
                    time.className = "mywall-posttime";

                    postContent.appendChild(poster);
                    postContent.appendChild(text);
                    postContent.appendChild(text);

                    postTarget.prepend(postContent);
                });
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}