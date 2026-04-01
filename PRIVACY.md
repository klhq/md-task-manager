# Privacy Policy

**Md Task Manager Pro** is a Telegram bot that manages tasks with Google Calendar integration.

## Data We Collect

- **Telegram user ID and profile** — to identify your account
- **Google Calendar OAuth tokens** — encrypted at rest (AES-256-GCM), used solely to create/update/delete calendar events on your behalf
- **Task data** — stored in your chosen storage provider (GitHub repository or cloud database)

## How We Use Your Data

- Calendar tokens are used only to sync task events with your Google Calendar
- Task data is stored and retrieved only for task management functionality
- We do not sell, share, or use your data for advertising

## Data Storage

- OAuth tokens are encrypted with AES-256-GCM before storage
- Access tokens are cached for up to 55 minutes and automatically refreshed
- All data is stored on Neon PostgreSQL (serverless) and Upstash Redis

## Data Deletion

- Use `/disconnect` to stop task syncing and deactivate your storage provider
- Use `/calendar` → Disconnect to revoke calendar access
- You can also revoke access at https://myaccount.google.com/permissions

## Contact

For questions or data deletion requests, open an issue at https://github.com/lazyskyline7/md-task-manager-pro/issues
