const inputTooltipOptions = (msg) => {
    return {
        'trigger': 'focus',
        'placement': 'right',
        'title': msg
    }
}

$(document).ready(() => {
    $('#signup-username').tooltip(inputTooltipOptions('Limit 25 characters'));
    $('#signup-password').tooltip(inputTooltipOptions('Password must be 8-40 characters. At least 1 letter, 1 number, and 1 special character'));
    $('#signup-firstname').tooltip(inputTooltipOptions('Limit 25 characters. Legal first name'));
    $('#signup-lastname').tooltip(inputTooltipOptions('Limit 25 characters. Legal last name'));
    $('#signup-email').tooltip(inputTooltipOptions('Valid emails only'));
    $('#signup-dob').tooltip(inputTooltipOptions('Must be at least 13 years of age'));
});

function createUser() {
    let user = {
        username: $('#signup-username').val(),
        password: $('#signup-password').val(),
        firstname: $('#signup-firstname').val(),
        lastname: $('#signup-lastname').val(),
        email: $('#signup-email').val(),
        dob: $('signup-dob').val(),
        timestamp: Date.parse().toString()
    };

    let userErr = '';
    if (!user.username.match(/^\w{1,25}$/)) {

    }

    $.ajax({
        url: '/ajaxpostsignup',
        type: 'POST',
        async: true,
        datatype: 'json',
        data: {
            user: user
        },
        success: (response) => {
            console.log(response);
        },
        error: (status) => {
            let errmsg = '';
            if (status == 401) {
                errmsg = '401: User not accepted. Please check your information.'
            } else if (status == 500) {
                errmsg = '500: Internal Server Error.'
            }
            $(".error-statusresponse").val(errmsg);
        }
    }); 
}