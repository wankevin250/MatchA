function searchUser() {
    let query = $('#wall-searchuser-input').val();
    window.location.href = `/searchuser?term=${query}`;
}

function getPosts() {
    $.ajax({
        url: '',
        type: 'GET',
        datatype: 'json',
        success: (response) => {
            let posts = JSON.parse(response);
            posts.forEach(d => {
                $('wall-target').append(createPost(d.userwall, d.poster, d.text, d.timestamp));
            });
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function createPost(userwall, poster, text, timestamp) {
    let post = document.createElement('div');
    
    let postheading = document.createElement('div');
    let postbody = document.createElement('div');
    let postfooter = document.createElement('div');

    let textPoster = document.createElement('p');
    let textWall = document.createElement('p');

    let textPostContents = document.createElement('p');
    let textTimestamp = document.createElement('p');

    textPoster.innerText = poster;
    textWall.innerText = userwall;

    textPostContents.innerText = text;

    textTimestamp.innerText = timestamp;

    postheading.appendChild(textPoster);
    postheading.appendChild(textWall);

    postbody.appendChild(textPostContents);
    postfooter.appendChild(textTimestamp);

    post.appendChild(postheading);
    post.appendChild(postbody);
    post.appendChild(postfooter);

    return post;
}