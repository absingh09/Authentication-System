from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from dotenv import load_dotenv
import logging
import os

load_dotenv()

logger = logging.getLogger(__name__)

# Resolve MAIL_FROM — fallback to MAIL_USERNAME if placeholder was left in .env
_mail_from = os.getenv("MAIL_FROM", "")
if not _mail_from or _mail_from == "youremail@gmail.com":
    _mail_from = os.getenv("MAIL_USERNAME", "")

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=_mail_from,
    MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
)

# Singleton — created once at module import, reused for every send
_fm = FastMail(conf)


async def send_reset_email(to_email: str, reset_link: str) -> None:
    """Send a styled password reset email with a single-use reset link."""

    html_body = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px;
                margin: auto; background: #0f172a; color: #e2e8f0;
                border-radius: 16px; overflow: hidden;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #2563eb, #4f46e5);
                  padding: 32px 40px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 8px;">🛡️</div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #fff;">
          Reset Your Password
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 36px 40px;">
        <p style="margin: 0 0 16px; color: #94a3b8; font-size: 15px; line-height: 1.6;">
          We received a request to reset the password for your account.
          Click the button below to set a new password.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="{reset_link}"
             style="display: inline-block; background: linear-gradient(135deg, #2563eb, #4f46e5);
                    color: #fff; padding: 14px 32px; border-radius: 10px;
                    text-decoration: none; font-weight: 700; font-size: 15px;
                    letter-spacing: 0.3px;">
            Reset Password →
          </a>
        </div>

        <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">
          ⏱️ This link expires in <strong style="color: #94a3b8;">15 minutes</strong>
          and can only be used once.
        </p>
        <p style="margin: 0; color: #64748b; font-size: 13px;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="padding: 20px 40px; border-top: 1px solid #1e293b;
                  text-align: center; color: #475569; font-size: 12px;">
        SaaS Auth System — Automated Security Email
      </div>
    </div>
    """

    message = MessageSchema(
        subject="Reset Your Password — SaaS Auth",
        recipients=[to_email],
        body=html_body,
        subtype=MessageType.html,
    )

    await _fm.send_message(message)
    logger.info(f"Password reset email sent to {to_email}")