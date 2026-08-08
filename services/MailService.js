// MailService.js

async function send({to, subject, body}) {
    console.log('------------------------');
    console.log('[MAIL] to: ', to);
    console.log('[MAIL] subject: ', subject);
    console.log('[MAIL] body: ', body);
    console.log(body);
    console.log('------------------------');


    return new Date();
}

module.exports = { send };