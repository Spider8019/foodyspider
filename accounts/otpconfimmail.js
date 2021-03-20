const sendingmailApiKey=process.env.SENDGRID_KEY
const sgMail=require('@sendgrid/mail')
sgMail.setApiKey(sendingmailApiKey)


const codeconfirm=(email,code)=>{
    sgMail.send({
    to: email, // Change to your recipient
    from: '2019uee0115@iitjammu.ac.in', // Change to your verified sender
    subject: 'Code confirmation for finaly delivery',
    html: `<strong>Your Code<br></strong><h1>${code}</h1><p>Thanks for shopping with us on <a href="https://foodspider.herokuapp.com">Pizza Boys</a></p>`,
    })
}

module.exports={
    codeconfirm
}