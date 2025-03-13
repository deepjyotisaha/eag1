# Gmail Manager Edge Extension

This browser extension helps you manage your unread Gmail emails efficiently by allowing you to:
- View all unread emails
- Mark selected emails as important
- Mark selected emails as read
- Delete remaining unread emails

## Setup Instructions

1. First, you need to set up a Google Cloud Project and obtain OAuth 2.0 credentials:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Gmail API for your project
   - Go to the Credentials page
   - Create an OAuth 2.0 Client ID for a Chrome Extension
   - Add your extension ID to the authorized JavaScript origins
   - Copy the client ID

2. Replace the `${YOUR_CLIENT_ID}` in the `manifest.json` file with your actual OAuth client ID.

3. Load the extension in Microsoft Edge:
   - Open Edge and go to `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `gmail-manager` folder

## Usage

1. Click the extension icon in your browser toolbar
2. Sign in with your Google account when prompted
3. View your unread emails in the popup
4. For each email:
   - Check "Mark as Important" to keep it as important
   - Check "Mark as Read" to mark it as read
   - Emails with no checkboxes selected will be deleted
5. Click "Process Selected" to apply your choices
6. Use the "Refresh" button to update the email list

## Features

- OAuth 2.0 authentication with Google
- View all unread emails
- Batch process emails with different actions
- Clean and intuitive user interface
- Automatic token refresh handling

## Security Note

This extension requires access to your Gmail account to function. It uses OAuth 2.0 for secure authentication and only requests the minimum necessary permissions to perform its functions.

## Privacy

The extension does not store any email content or personal data. It only stores the OAuth token locally for authentication purposes.

## Support

For issues or questions, please file an issue in the repository. 