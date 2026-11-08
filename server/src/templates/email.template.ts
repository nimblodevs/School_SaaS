function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[character]);
}

function emailLayout({ preheader, title, greeting, content, footer = 'If you did not request this, you can safely ignore this email.' }) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f6f2;font-family:Arial,Helvetica,sans-serif;color:#263b31;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f6f2;">
      <tr><td align="center" style="padding:36px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e1e8e0;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:24px 32px;background-color:#183d35;">
            <p style="margin:0;color:#d3e77a;font-family:Georgia,serif;font-size:23px;font-weight:bold;letter-spacing:.3px;">School SMIS</p>
            <p style="margin:6px 0 0;color:#d6e2d9;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">School Management Information System</p>
          </td></tr>
          <tr><td style="padding:32px;">
            <h1 style="margin:0 0 18px;color:#183d35;font-family:Georgia,serif;font-size:26px;line-height:1.25;font-weight:normal;">${escapeHtml(title)}</h1>
            ${greeting ? `<p style="margin:0 0 16px;color:#34463b;font-size:15px;line-height:1.65;">${greeting}</p>` : ''}
            ${content}
            <p style="margin:24px 0 0;color:#718077;font-size:12px;line-height:1.6;">${escapeHtml(footer)}</p>
          </td></tr>
          <tr><td style="padding:17px 32px;border-top:1px solid #edf0eb;">
            <p style="margin:0;color:#879389;font-size:11px;line-height:1.5;">This is an automated message from School SMIS. Please do not reply to this email.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function codeEmail({ title, description, otp, expiresInMinutes, preheader, footer }) {
    return emailLayout({
        preheader,
        title,
        content: `<p style="margin:0 0 20px;color:#52645a;font-size:15px;line-height:1.65;">${escapeHtml(description)}</p>
          <div style="margin:0 0 20px;padding:20px 16px;border:1px solid #dce6d9;border-radius:8px;background-color:#f7f9f5;text-align:center;">
            <p style="margin:0 0 7px;color:#718077;font-size:10px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase;">Your verification code</p>
            <p style="margin:0;color:#183d35;font-family:Arial,Helvetica,sans-serif;font-size:34px;font-weight:bold;letter-spacing:8px;">${escapeHtml(otp)}</p>
          </div>
          <p style="margin:0;color:#52645a;font-size:13px;line-height:1.6;">This code expires in <strong>${escapeHtml(expiresInMinutes)} minutes</strong>. For your security, do not share it with anyone.</p>`,
        footer,
    });
}

export function loginOtpEmailTemplate({ otp, expiresInMinutes }) {
    return codeEmail({
        preheader: 'Your School SMIS login verification code.',
        title: 'Verify your sign-in',
        description: 'Use the code below to finish signing in to your School SMIS account.',
        otp,
        expiresInMinutes,
        footer: 'If you did not try to sign in, secure your account by changing your password.',
    });
}

export function emailVerificationEmailTemplate({ otp, expiresInMinutes }) {
    return codeEmail({
        preheader: 'Verify your School SMIS email address.',
        title: 'Verify your email',
        description: 'Use the code below to verify your email address and finish setting up your School SMIS account.',
        otp,
        expiresInMinutes,
        footer: 'If you did not create a School SMIS account, no action is needed.',
    });
}

export function passwordResetEmailTemplate({ otp, expiresInMinutes }) {
    return codeEmail({
        preheader: 'Your School SMIS password reset code.',
        title: 'Reset your password',
        description: 'We received a request to reset the password for your School SMIS account.',
        otp,
        expiresInMinutes,
        footer: 'If you did not request a password reset, no changes have been made to your account.',
    });
}

export function temporaryCredentialsEmailTemplate({ firstName, role, email, temporaryPassword }) {
    return emailLayout({
        preheader: 'Your School SMIS account has been created.',
        title: 'Your account is ready',
        greeting: `Hello ${escapeHtml(firstName)},`,
        content: `<p style="margin:0 0 20px;color:#52645a;font-size:15px;line-height:1.65;">Your ${escapeHtml(String(role).toLowerCase())} account has been created. Sign in with the credentials below:</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e1e8e0;border-radius:8px;">
            <tr><td style="padding:13px 16px;border-bottom:1px solid #edf0eb;color:#718077;font-size:12px;">Email</td><td style="padding:13px 16px;border-bottom:1px solid #edf0eb;color:#263b31;font-size:13px;font-weight:bold;word-break:break-word;">${escapeHtml(email)}</td></tr>
            <tr><td style="padding:13px 16px;color:#718077;font-size:12px;">Temporary password</td><td style="padding:13px 16px;color:#263b31;font-family:monospace;font-size:13px;font-weight:bold;word-break:break-word;">${escapeHtml(temporaryPassword)}</td></tr>
          </table>
          <div style="margin-top:20px;padding:14px 16px;border-left:4px solid #b34d3d;background-color:#fff7f2;">
            <p style="margin:0;color:#744a36;font-size:13px;font-weight:bold;line-height:1.6;">For your security, you must change this temporary password immediately after signing in.</p>
          </div>`,
        footer: 'Never share your password. School SMIS staff will never ask you to disclose it.',
    });
}

export function parentActivationEmailTemplate({ firstName, token }) {
    return emailLayout({
        preheader: 'Activate your School SMIS parent account.',
        title: 'Activate your parent account',
        greeting: `Hello ${escapeHtml(firstName)},`,
        content: `<p style="margin:0 0 20px;color:#52645a;font-size:15px;line-height:1.65;">Use this activation token to activate your School SMIS parent account:</p>
          <div style="padding:16px;border:1px solid #dce6d9;border-radius:8px;background-color:#f7f9f5;color:#183d35;font-family:monospace;font-size:15px;font-weight:bold;line-height:1.6;word-break:break-all;">${escapeHtml(token)}</div>
          <p style="margin:18px 0 0;color:#52645a;font-size:13px;line-height:1.6;">This token expires in <strong>48 hours</strong>. Keep it private and do not forward this email.</p>`,
        footer: 'If you were not expecting this invitation, you can safely ignore this email.',
    });
}
