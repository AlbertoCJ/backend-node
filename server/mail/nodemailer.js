// const nodemailer = require('nodemailer');
// // email sender function
// sendEmail = (to, subject, text) => {
//   if (process.env.EMAIL !== 'null' && process.env.EMAIL_PASS !== 'null') {
//     // Definimos el transporter
//     const transporter = nodemailer.createTransport({
//         service: 'gmail',
//         auth: {
//             user: process.env.EMAIL,
//             pass: process.env.EMAIL_PASS
//         }
//     });
//     // Definimos el email
//     const mailOptions = {
//         from: 'no-replay',
//         to,
//         subject,
//         text
//     };
//     // Enviamos el email
//     transporter.sendMail(mailOptions, function(error, info){
//         if (error){
//             console.log(error);
//         } else {
//             console.log("Email sent");
//         }
//     });
//   }
// };

// module.exports = {
//   sendEmail
// }


const nodemailer = require('nodemailer');
const {google} = require ("googleapis"); 
const OAuth2 = google.auth.OAuth2;

const myOAuth2Client = new OAuth2(
  process.env.OAUTH2_CLIENT_ID,
  process.env.OAUTH2_CLIENT_SECRET,
);

myOAuth2Client.setCredentials({
  refresh_token: process.env.OAUTH2_REFRESH_TOKEN
});

const myAccessToken = myOAuth2Client.getAccessToken();



const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
       type: "OAuth2",
       user: process.env.EMAIL, //your gmail account you used to set the project up in google cloud console"
       clientId: process.env.OAUTH2_CLIENT_ID,
       clientSecret: process.env.OAUTH2_CLIENT_SECRET,
       refreshToken: process.env.OAUTH2_REFRESH_TOKEN,
       accessToken: myAccessToken //access token variable we defined earlier
  }});

  // email sender function
sendEmail = (to, subject, text) => {
  if (process.env.EMAIL !== 'null' && process.env.OAUTH2_CLIENT_ID !== 'null' && process.env.OAUTH2_CLIENT_SECRET !== 'null' && process.env.OAUTH2_REFRESH_TOKEN !== 'null') {
    // Definimos el transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
           type: "OAuth2",
           user: process.env.EMAIL, //your gmail account you used to set the project up in google cloud console"
           clientId: process.env.OAUTH2_CLIENT_ID,
           clientSecret: process.env.OAUTH2_CLIENT_SECRET,
           refreshToken: process.env.OAUTH2_REFRESH_TOKEN,
           accessToken: myAccessToken //access token variable we defined earlier
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