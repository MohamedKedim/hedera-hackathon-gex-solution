import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";

// --- MSAL CONFIG ---
const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
  },
};

const cca = new ConfidentialClientApplication(msalConfig);

// --- TOKEN ACQUISITION ---
async function getAccessToken(): Promise<string> {
  const result = await cca.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"],
  });
  if (!result?.accessToken) throw new Error("❌ Failed to acquire access token");
  return result.accessToken;
}

// --- GRAPH CLIENT ---
async function getGraphClient() {
  const token = await getAccessToken();
  return Client.init({
    authProvider: (done) => done(null, token),
  });
}

// --- GENERIC SEND EMAIL ---
async function sendMail(to: string, subject: string, html: string, from: string = process.env.EMAIL_USER!) {
  const client = await getGraphClient();
  await client.api(`/users/${from}/sendMail`).post({
    message: {
      subject,
      body: { contentType: "HTML", content: html },
      toRecipients: [{ emailAddress: { address: to } }],
      from: { emailAddress: { address: from } },
    },
  });
  console.log(`✅ Email sent to ${to}: ${subject}`);
}

// --- EMAIL HELPERS ---
export async function sendConfirmationEmail(email: string, connectedUserName?: string, plantName?: string) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(to right, #0072BC, #00B140); padding: 15px 20px; text-align: center; }
        .header img { max-width: 120px; height: auto; display: block; margin: 0 auto; }
        .content { padding: 30px; }
        .content h1 { color: #333333; font-size: 24px; margin-bottom: 20px; }
        .content p { color: #666666; font-size: 16px; line-height: 1.5; margin-bottom: 20px; }
        .plant { font-size: 18px; font-weight: bold; color: #0072BC; margin-bottom: 16px; }
        .footer { background: #f4f4f4; padding: 20px; text-align: center; color: #666666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://geomap.greenearthx.io/gex-logo.png" alt="GEX Logo" />
        </div>
        <div class="content">
          <h1>Submission Received</h1>
          <p>Hello <strong>${connectedUserName || 'User'}</strong>,</p>
          <p class="plant">Plant Modified: ${plantName || 'Unknown Plant'}</p>
          <p>Your changes have been submitted and will be reviewed by our team for verification.<br />You will receive another email once your submission is approved.</p>
          <p style="margin-top: 32px; color: #666;">Thank you!<br />GreenEarthX Team</p>
        </div>
        <div class="footer">
          <p>© 2025 GEX. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  await sendMail(email, "Submission Received - GreenEarthX", html);
}

export async function sendContactEmail(
  toEmail: string,
  userName: string,
  topic: string,
  message: string,
  userEmail: string,
  telephone?: string
) {
  const html = topic === 'Request New Entry'
    ? `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(to right, #0072BC, #00B140); padding: 15px 20px; text-align: center; }
          .header img { max-width: 120px; height: auto; display: block; margin: 0 auto; }
          .content { padding: 30px; }
          .content h1 { color: #333333; font-size: 22px; margin-bottom: 20px; }
          .content p { color: #555555; font-size: 15px; line-height: 1.5; margin-bottom: 12px; }
          .highlight { font-weight: bold; color: #0072BC; }
          .footer { background: #f4f4f4; padding: 20px; text-align: center; color: #666666; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://geomap.greenearthx.io/gex-logo.png" alt="GEX Logo" />
          </div>
          <div class="content">
            <h1>New Contact Message - Request New Entry</h1>
            <p><span class="highlight">From:</span> ${userName} (${userEmail})</p>
            <p><span class="highlight">Telephone:</span> ${telephone || 'Not provided'}</p>
            <p><span class="highlight">Topic:</span> ${topic}</p>
            <p><span class="highlight">Plant Details:</span><br/>${message}</p>
            <p style="margin-top: 32px; color: #666;">This email was generated automatically from the contact form.</p>
          </div>
          <div class="footer">
            <p>© 2025 GEX. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
    : `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(to right, #0072BC, #00B140); padding: 15px 20px; text-align: center; }
          .header img { max-width: 120px; height: auto; display: block; margin: 0 auto; }
          .content { padding: 30px; }
          .content h1 { color: #333333; font-size: 22px; margin-bottom: 20px; }
          .content p { color: #555555; font-size: 15px; line-height: 1.5; margin-bottom: 12px; }
          .highlight { font-weight: bold; color: #0072BC; }
          .footer { background: #f4f4f4; padding: 20px; text-align: center; color: #666666; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://geomap.greenearthx.io/gex-logo.png" alt="GEX Logo" />
          </div>
          <div class="content">
            <h1>New Contact Message</h1>
            <p><span class="highlight">From:</span> ${userName} (${userEmail})</p>
            <p><span class="highlight">Topic:</span> ${topic}</p>
            <p><span class="highlight">Message:</span><br/>${message}</p>
            <p style="margin-top: 32px; color: #666;">This email was generated automatically from the contact form.</p>
          </div>
          <div class="footer">
            <p>© 2025 GEX. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  await sendMail(toEmail, `New Contact Message - ${topic}`, html);
}