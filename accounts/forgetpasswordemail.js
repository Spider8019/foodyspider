const sendingmailApiKey=process.env.SENDGRID_API
const sgMail=require('@sendgrid/mail')
sgMail.setApiKey(sendingmailApiKey)


const forgetpassword=(email)=>{
    const msg = {
    to: email, // Change to your recipient
    from: 'xaman@lenzgig.com', // Change to your verified sender
    subject: 'Reset Password Link',
    text: 'and easy to do anywhere, even with Node.js',
    html: `<p>Click on given link to reset password<br></p><a href="http://localhost:3000/resetpassword/${email}" style="background:rgb(110,7,7);color:rgb(253,253,253);padding:1rem 3rem;font-size:1.5rem;text-decoration:none;margin:2rem 0;border-radius:0.5rem;display:inline-block;">Change password</a><br><br>With the blessings of Shri Krishna <br>Please don"t share this mail.`,
    }

    sgMail.send(msg).then(()=>{
        console.log("successfully sent")
    }).catch((error)=>{
    console.log(`there is an error ${error}`)
    })
}

module.exports={
    forgetpassword
}