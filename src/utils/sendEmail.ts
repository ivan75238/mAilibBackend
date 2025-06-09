import nodemailer, { Transporter, SendMailOptions } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

async function sendEmail(email: string, html: string): Promise<void> {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASSWORD
  ) {
    throw new Error("SMTP configuration is missing in environment variables");
  }

  const transporter: Transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: true, // true для порта 465, false для других портов
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    await transporter.verify();
    console.log("Соединение с SMTP-сервером установлено");
  } catch (error) {
    console.error("Ошибка подключения к SMTP:", error);
    return;
  }

  const mailOptions: SendMailOptions = {
    from: `mAilib Team <mailib.team@mail.ru>`,
    to: email,
    subject: "Подтверждение регистрации",
    text: "",
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Письмо успешно отправлено:", info.messageId);
  } catch (error) {
    console.error(
      "Ошибка отправки:",
      error instanceof Error ? error.message : error
    );
  }
}

export default sendEmail;
