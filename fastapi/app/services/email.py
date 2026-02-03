from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from app.core.config import settings
from typing import List

import socket

def get_ipv4_address(hostname: str) -> str:
    try:
        # Get address info for the hostname, forcing IPv4 (AF_INET)
        addr_info = socket.getaddrinfo(hostname, None, family=socket.AF_INET)
        if addr_info:
            # Return the first IPv4 address found
            return addr_info[0][4][0]
    except Exception as e:
        print(f"Error resolving IPv4 for {hostname}: {e}")
    return hostname

mail_server = get_ipv4_address(settings.MAIL_SERVER)

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=mail_server,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=False # Cert validation disabled because we are using IP address to avoid IPv6 timeout
)

async def send_email(subject: str, email_to: List[EmailStr], body: str):
    message = MessageSchema(
        subject=subject,
        recipients=email_to,
        body=body,
        subtype=MessageType.html
    )
    
    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

async def send_new_account_email(email: EmailStr, password: str, full_name: str):
    subject = "Welcome to ForceCodeX - Account Created"
    body = f"""
    <html>
        <body>
            <h1>Welcome {full_name}!</h1>
            <p>Your account has been created successfully.</p>
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Temp Password:</strong> {password}</p>
            <p>Please login and change your password immediately.</p>
        </body>
    </html>
    """
    return await send_email(subject, [email], body)
