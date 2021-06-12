const sendingmailApiKey=process.env.SENDGRID_KEY
const sgMail=require('@sendgrid/mail')
sgMail.setApiKey(sendingmailApiKey)


const codeconfirm=(email,code)=>{
    sgMail.send({
    to: email, // Change to your recipient
    from: 'xaman@lenzgig.com', // Change to your verified sender
    subject: 'Code confirmation for finaly delivery',
    html: `<strong>Your Code<br></strong><h1>${code}</h1><p>Thanks for shopping with us on <a href="http://localhost:3000">Pizza Boys</a></p>`,
    })
}

module.exports={
    codeconfirm
}