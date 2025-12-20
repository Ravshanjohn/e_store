import { MailtrapClient } from "mailtrap";
import dotenv from "dotenv";

dotenv.config();

export const mailtrapClient = new MailtrapClient({
  token: process.env.EMAIL_TOKEN,
});
if (!process.env.EMAIL_TOKEN) {
  console.warn("EMAIL_TOKEN is not set; outgoing emails will fail.");
}

export const sender = {
  email: process.env.SENDER,
  name: process.env.SENDER,
};



