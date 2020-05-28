const nodemailer = require('nodemailer');
// email sender function
sendEmail = (to, subject, text) => {
  if (process.env.EMAIL !== 'null' && process.env.EMAIL_PASS !== 'null') {
    // Definimos el transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASS
        }
    });
    // Definimos el email
    const mailOptions = {
        from: 'no-replay',
        to,
        subject,
        text
    };
    // Enviamos el email
    transporter.sendMail(mailOptions, function(error, info){
        if (error){
            console.log(error);
        } else {
            console.log("Email sent");
        }
    });
  }
};

module.exports = {
  sendEmail
}