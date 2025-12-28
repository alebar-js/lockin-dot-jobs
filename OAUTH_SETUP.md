# OAuth Setup Guide

This application supports authentication via Google, GitHub, LinkedIn, and Facebook.

## Required Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# NextAuth Configuration
AUTH_SECRET=your-nextauth-secret-here

# Google OAuth
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# GitHub OAuth
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret

# LinkedIn OAuth
AUTH_LINKEDIN_ID=your-linkedin-client-id
AUTH_LINKEDIN_SECRET=your-linkedin-client-secret

# Facebook OAuth
AUTH_FACEBOOK_ID=your-facebook-app-id
AUTH_FACEBOOK_SECRET=your-facebook-app-secret
```

## Setup Instructions

### 1. Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth 2.0 Client ID"
5. Configure the OAuth consent screen if prompted
6. Set Application type to "Web application"
7. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
8. Copy the Client ID and Client Secret to your `.env.local`

### 2. GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - Application name: Your app name
   - Homepage URL: `http://localhost:3000` (development) or your production URL
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy the Client ID
6. Generate a new Client Secret and copy it
7. Add both to your `.env.local`

### 3. LinkedIn OAuth

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click "Create app"
3. Fill in the required information
4. In the "Auth" tab, add redirect URLs:
   - `http://localhost:3000/api/auth/callback/linkedin` (development)
   - `https://yourdomain.com/api/auth/callback/linkedin` (production)
5. Under "Products", request access to "Sign In with LinkedIn using OpenID Connect"
6. Copy the Client ID and Client Secret to your `.env.local`

### 4. Facebook OAuth

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" > "Create App"
3. Select "Consumer" as the app type
4. Fill in the app details
5. In the dashboard, go to "Settings" > "Basic"
6. Copy the App ID and App Secret
7. Add Facebook Login product to your app
8. In Facebook Login settings, add OAuth redirect URIs:
   - `http://localhost:3000/api/auth/callback/facebook` (development)
   - `https://yourdomain.com/api/auth/callback/facebook` (production)
9. Add the App ID and App Secret to your `.env.local`

## Database Migration

After setting up the OAuth providers, run the database migration to add the new columns:

```bash
npm run db:push
```

This will add the `facebook_id` column to the `users` table (the other provider columns should already exist).

## Testing

1. Start your development server: `npm run dev`
2. Navigate to `/login`
3. You should see four OAuth provider buttons
4. Click any provider to test the authentication flow

## Notes

- Users can link multiple OAuth providers to the same account (by email)
- The first provider used will create the account
- Subsequent providers with the same email will be linked to the existing account
- Each provider ID is stored in a separate column in the database
