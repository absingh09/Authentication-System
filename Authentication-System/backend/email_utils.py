from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from dotenv import load_dotenv
import os

load_dotenv()

mail_from = os.getenv("MAIL_FROM")
if not mail_from or mail_from == "youremail@gmail.com":
    mail_from = os.getenv("MAIL_USERNAME")

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=mail_from,
    MAIL_PORT=int(os.getenv("MAIL_PORT")),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
)


async def send_reset_email(to_email: str, reset_link: str):
    """Send a password reset email with a clickable link."""

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
        <h2>Reset Your Password</h2>
        <p>We received a request to reset your password. Click the button below:</p>
        <a href="{reset_link}"
           style="display: inline-block; background: #4f46e5; color: white;
                  padding: 12px 24px; border-radius: 8px; text-decoration: none;
                  margin: 16px 0;">
           Reset Password
        </a>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
    </div>
    """

    message = MessageSchema(
        subject="Reset Your Password",
        recipients=[to_email],
        body=html_body,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    await fm.send_message(message)