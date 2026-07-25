// Email abstraction. The contact gate (magic-link) needs to send mail, but
// real transport isn't wired yet, so this defaults to a console transport that
// logs the message (and the magic link) to the server log — enough to develop
// and test the whole flow offline. Set SMTP_URL to switch to real delivery via
// nodemailer without any code change.

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export interface EmailTransport {
  readonly name: string;
  send(msg: OutgoingEmail): Promise<void>;
}

const consoleTransport: EmailTransport = {
  name: "console",
  async send(msg) {
    // eslint-disable-next-line no-console
    console.log(
      `\n[email:console] to=${msg.to} subject=${JSON.stringify(msg.subject)}\n${msg.text}\n`,
    );
  },
};

// nodemailer is imported lazily so the console path has zero runtime deps.
function smtpTransport(url: string): EmailTransport {
  return {
    name: "smtp",
    async send(msg) {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport(url);
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Artificial Atheist <no-reply@artificialatheist.com>",
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      });
    },
  };
}

let cached: EmailTransport | null = null;

export function getEmailTransport(): EmailTransport {
  if (cached) return cached;
  const url = process.env.SMTP_URL;
  cached = url ? smtpTransport(url) : consoleTransport;
  return cached;
}

export async function sendEmail(msg: OutgoingEmail): Promise<void> {
  await getEmailTransport().send(msg);
}
