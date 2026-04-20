import boto3
from botocore.exceptions import ClientError
from app.config import settings


def send_receipt_email(to_email: str, customer_name: str, sale_id: int, pdf_bytes: bytes) -> bool:
    """Send a receipt PDF via AWS SES."""
    import email as email_lib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.application import MIMEApplication

    msg = MIMEMultipart("mixed")
    msg["Subject"] = f"Your Receipt – Sale #{sale_id:05d} | CementTrack"
    msg["From"] = settings.ses_sender_email
    msg["To"] = to_email

    html_body = f"""
    <html>
    <body style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: auto; padding: 24px;">
      <div style="background: #f97316; padding: 20px; border-radius: 8px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">CementTrack</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">Your Sales Receipt</p>
      </div>
      <div style="padding: 24px 0;">
        <p>Dear <strong>{customer_name or "Customer"}</strong>,</p>
        <p>Thank you for your purchase. Please find your receipt (Sale <strong>#{sale_id:05d}</strong>) attached as a PDF.</p>
        <p style="color: #64748b; font-size: 14px;">
          If you have any questions about this receipt, please contact us at
          <a href="mailto:{settings.ses_sender_email}">{settings.ses_sender_email}</a>.
        </p>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        CementTrack Business Manager · Powered by AWS
      </p>
    </body>
    </html>
    """

    body_part = MIMEMultipart("alternative")
    body_part.attach(MIMEText(html_body, "html"))
    msg.attach(body_part)

    attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
    attachment.add_header("Content-Disposition", "attachment", filename=f"receipt-{sale_id:05d}.pdf")
    msg.attach(attachment)

    try:
        ses = boto3.client("ses", region_name=settings.aws_region)
        ses.send_raw_email(
            Source=settings.ses_sender_email,
            Destinations=[to_email],
            RawMessage={"Data": msg.as_bytes()},
        )
        return True
    except ClientError as e:
        print(f"SES error: {e.response['Error']['Message']}")
        return False
