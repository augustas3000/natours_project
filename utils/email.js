const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');
// a more robust solution with sendgrid:
// The idea:
// 1. We want to send an email.
// 2. We import this email class
// 3. Use it like this - > new Email(user, url).sendWelcome(); etc ...

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    // email address will be defined as a configuration variable, an
    // ENVIRONMENT VARIABLE
    this.from = `Augustas <${process.env.EMAIL_FROM}>`;
  }

  // when in production, we want to send real emails
  // when in dev we still use our mailtrap application like we did before
  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // create a transporter for sendgrid

      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }

    // return nodemailer transporter
    // using mailtrap - simulation
    return nodemailer.createTransport({
      // service: 'Gmail', if gmail is intended
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  // a method that will do actual sending, receives a template and a
  // subject, more specific send methods will rely on this initial
  // send()

  async send(template, subject) {
    // create an html ot of the template so we can then send it as
    // email, not with render() which creates html based on pug
    // template and sends it to the client
    // __dirname is the location of the currently running script
    // we can also pass data to render file, IMPORTANT for email
    // personalization

    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject: subject
      }
    );
    // define email options:
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html: html, //so we specify html, we gonna have a pug tempalte from which we gonna generate this html
      text: htmlToText.fromString(html) //convert all html to simple text
    };

    // create transport and send email:
    const transporter = this.newTransport();
    await transporter.sendMail(mailOptions); // returns promise
  }

  async sendWelcome() {
    // lets await so the function only returns once an email hs been sent
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 mins)'
    );
  }
};
