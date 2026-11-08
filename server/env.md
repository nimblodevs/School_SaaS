# Runtime mode and port; WEB_ORIGIN lists browser origins allowed by the API.
NODE_ENV=development
PORT=5000
WEB_ORIGIN=http://localhost:5173

# Postgres — your database connection
DATABASE_URL="postgresql://neondb_owner:npg_g4t1nUzpxCDm@ep-noisy-boat-be6rdizt.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DATABASE_URL_POOLED="postgresql://neondb_owner:npg_g4t1nUzpxCDm@ep-noisy-boat-be6rdizt-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Storage — S3-compatible object storage
AWS_ENDPOINT_URL_S3="https://br-weathered-haze-beioyg1t.storage.c-9.us-east-2.aws.neon.tech"
AWS_ACCESS_KEY_ID="nak_live_2c7c684353994e829cf8a8f857660fee"
AWS_SECRET_ACCESS_KEY="nsk_live_52ba3d4cdc9e4dac69428a225b9656ab3257b8c669b08b93601f56a10864ad8c"
AWS_REGION="us-east-2"
S3_BUCKET="school-assets"

# Functions — serverless endpoints
# Deploy a neon function with the 'neon deploy' cli command or deploy a function from one of Neon's sample templates with 'neon bootstrap'

# Realtime — live SQL query subscriptions
NEON_REALTIME_URL="https://ep-noisy-boat-be6rdizt.rt.c-9.us-east-2.aws.neon.tech/"
NEON_REALTIME_SECRET="nrt_live_1Uv9jX5Z_ZfO_c_ulJTJVCpJrCx4XdCqYPQphOAQdwtE"

OTEL_SERVICE_NAME=school-saas-api
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=
OTEL_PROMETHEUS_HOST=0.0.0.0
OTEL_PROMETHEUS_PORT=9464
GRAFANA_ADMIN_PASSWORD=school-saas-local

# Authentication code lifetime, rate limits, proxy trust, and local upload directory.
LOGIN_OTP_MINUTES=3
AUTH_OTP_PEPPER=replace-with-a-stable-random-secret-at-least-32-characters
TRUST_PROXY=false
# false disables proxy trust; set a trusted hop count (for example 1) or proxy address/CIDR list only when deployed behind a proxy.
LOCAL_UPLOAD_DIR=./uploads
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
LOGIN_RATE_LIMIT_WINDOW_MINUTES=15
LOGIN_RATE_LIMIT_PER_IP=10
LOGIN_RATE_LIMIT_PER_IDENTIFIER=5
OTP_MAX_ATTEMPTS=10
OTP_RATE_LIMIT_PER_USER=10
OTP_RESEND_LIMIT=3
OTP_RESEND_WINDOW_MINUTES=10
# Pino log verbosity (for example: debug, info, warn, or error).
LOG_LEVEL=info


# -----------------------------------------------------------------------------
# M-Pesa Configuration
# -----------------------------------------------------------------------------
MPESA_ENVIRONMENT="sandbox"
MPESA_CONSUMER_KEY="2Wbdl9OD0hZ5tkWJydsgQMqSyY4sOhNxQAJTcnDl8VakDvAU"
MPESA_CONSUMER_SECRET="HWkrkhMCKWujptSCCumQRX7zBVC1RFrV8waJkZgAwg1JwGcjlzh39cpFIIUD7Ktc"
MPESA_SHORTCODE="174379"
MPESA_PASSKEY="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
MPESA_CALLBACK_URL="https://yourdomain.com/mpesa/callback"
MPESA_INITIATOR_NAME="your_mpesa_initiator_name_here"
MPESA_SECURITY_CREDENTIAL="your_mpesa_security_credential_here"
MPESA_ALLOWED_IPS="your_allowed_ips_here"

# SMTP email delivery for email verification and password recovery.
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="murichuchichi@gmail.com"
SMTP_PASSWORD="lrek jmbz cdrk otnh"
AUTH_EMAIL_FROM="<School SMIS>murichuchichi@gmail.com"
