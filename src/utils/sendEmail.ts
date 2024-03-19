
import nodemailer from 'nodemailer'
import { EMAIL_HOST, EMAIL_PASS, EMAIL_USER } from '../secrets';

export interface SendEmailProps {
  subject: string,
  message: string,
  send_to: string,
  sent_from: string,
  reply_to: string
}

export const sendEmail = async ( props: SendEmailProps ): Promise<void> => {
  // Create Email Transporter
  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: 587,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    }
  }) 

  // Options fro Sending Email
  const options = {
    from: props.sent_from,
    to: props.send_to,
    replyTo: props.reply_to,
    subject: props.subject,
    html: props.message,
  }

  // Send Email
  transporter.sendMail(options, function(err, info) {
    if(err) {
      console.log(err);
    } else {
      console.log(info);
    }
  })
};