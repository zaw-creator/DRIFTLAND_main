import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendContactEmail({ name, email, subject, message }) {
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      process.env.ADMIN_EMAIL,
    replyTo: `"${name}" <${email}>`,
    subject: `[Contact] ${subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0d0d0d;color:#fff;padding:32px;border-radius:8px;">
        <h2 style="color:#FFBB00;margin:0 0 24px;letter-spacing:0.05em;">New Contact Message</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:8px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;width:80px;">Name</td>
              <td style="padding:8px 0;color:#fff;">${name}</td></tr>
          <tr><td style="padding:8px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Email</td>
              <td style="padding:8px 0;"><a href="mailto:${email}" style="color:#FFBB00;">${email}</a></td></tr>
          <tr><td style="padding:8px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Subject</td>
              <td style="padding:8px 0;color:#fff;">${subject}</td></tr>
        </table>
        <div style="border-top:1px solid #1a1a1a;padding-top:20px;">
          <p style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">Message</p>
          <p style="color:#ddd;line-height:1.7;margin:0;white-space:pre-wrap;">${message}</p>
        </div>
      </div>
    `,
  });
}
