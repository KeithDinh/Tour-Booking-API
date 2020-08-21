const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1) create a transporter(a service that sends email like gmail)
  /* Mailtrap: a development service that fakes to send emails to real addresses
  These emails end up trapped in a development inbox */
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 2) define the email options
  const mailOptions = {
    from: '"Keith Dinh" <admin@gmail.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // 3) actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
