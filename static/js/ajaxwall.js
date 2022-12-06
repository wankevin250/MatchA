function searchUser() {
    let query = $('#wall-searchuser-input').val();
    window.location.href = `/searchuser?term=${query}`;
}