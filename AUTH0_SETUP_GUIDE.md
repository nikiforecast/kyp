# Auth0 Setup Guide for Google Login

This guide will walk you through setting up Auth0 for Google OAuth authentication in your Journey Studio application.

## Prerequisites

- An Auth0 account (sign up at https://auth0.com if you don't have one)
- A Google Cloud Platform account (for OAuth credentials)
- Your application's domain/URL

## Step 1: Create an Auth0 Application

1. Log in to your [Auth0 Dashboard](https://manage.auth0.com/)
2. Navigate to **Applications** → **Applications** in the sidebar
3. Click **Create Application**
4. Enter a name for your application (e.g., "Journey Studio")
5. Select **Single Page Web Applications** as the application type
6. Click **Create**

## Step 2: Configure Auth0 Application Settings

1. In your application settings, go to the **Settings** tab
2. Note down the following values (you'll need them later):
   - **Domain** (e.g., `your-tenant.auth0.com`)
   - **Client ID**

3. Scroll down to **Allowed Callback URLs** and add:
   ```
   http://localhost:5173,http://localhost:3000,https://your-production-domain.com
   ```
   Replace `your-production-domain.com` with your actual production domain.

4. Scroll to **Allowed Logout URLs** and add:
   ```
   http://localhost:5173,http://localhost:3000,https://your-production-domain.com
   ```

5. Scroll to **Allowed Web Origins** and add:
   ```
   http://localhost:5173,http://localhost:3000,https://your-production-domain.com
   ```

6. Click **Save Changes**

## Step 3: Enable Google Social Connection

1. In the Auth0 Dashboard, navigate to **Authentication** → **Social** in the sidebar
2. Click on **Google**
3. If you haven't set up Google OAuth yet:
   - Click **Create Application** in Google
   - You'll be redirected to Google Cloud Console
   - Create a new project or select an existing one
   - Enable the Google+ API
   - Create OAuth 2.0 credentials
   - Copy the **Client ID** and **Client Secret** back to Auth0
4. If you already have Google OAuth credentials:
   - Enter your **Client ID** and **Client Secret**
   - Click **Save**
5. Make sure the connection is **Enabled** (toggle should be ON)

## Step 4: Configure Google OAuth in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized JavaScript origins**, add:
   ```
   https://your-tenant.auth0.com
   ```
   (Replace `your-tenant` with your Auth0 tenant name)

6. Under **Authorized redirect URIs**, add:
   ```
   https://your-tenant.auth0.com/login/callback
   ```
   (Replace `your-tenant` with your Auth0 tenant name)

7. Click **Save**

## Step 5: Set Up Environment Variables

1. Create a `.env` file in your project root (if it doesn't exist)
2. Add the following environment variables:

```env
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id-here
VITE_AUTH0_AUDIENCE=your-api-audience (optional, only if using Auth0 API)
```

**Important Notes:**
- Replace `your-tenant.auth0.com` with your actual Auth0 domain
- Replace `your-client-id-here` with your Auth0 Client ID from Step 2
- The `VITE_AUTH0_AUDIENCE` is optional and only needed if you're using Auth0 to protect an API
- Never commit your `.env` file to version control (it should be in `.gitignore`)

## Step 6: Configure Application to Use Google Connection

By default, Auth0 will show a login page with multiple options. To force Google login:

1. In Auth0 Dashboard, go to **Branding** → **Universal Login**
2. You can customize the login experience, or
3. In your application code, we're already configured to use `google-oauth2` connection directly

The code in `src/hooks/useAuth.ts` already specifies the Google connection:
```typescript
await auth0.loginWithRedirect({
  authorizationParams: {
    connection: 'google-oauth2',
  },
})
```

## Step 7: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to your application (usually `http://localhost:5173`)
3. You should see a "Sign in with Google" button on the login page
4. Click the button and you should be redirected to Google's OAuth consent screen
5. After authorizing, you'll be redirected back to your application

## Step 8: Handle User Data After Login

After a user successfully logs in with Google, Auth0 will provide user information. The `useAuth` hook automatically converts Auth0 user data to a format compatible with your existing Supabase user structure.

The user object will contain:
- `id`: Auth0 user ID (sub claim)
- `email`: User's email address from Google
- `user_metadata`: Additional user metadata from Auth0

## Troubleshooting

### Issue: "Invalid redirect_uri"
- **Solution**: Make sure your callback URL is added to the **Allowed Callback URLs** in Auth0 Dashboard
- Check that the URL matches exactly (including protocol http/https and port)

### Issue: Google OAuth error
- **Solution**: Verify your Google OAuth credentials are correct in Auth0 Dashboard
- Check that the authorized redirect URI in Google Cloud Console includes `https://your-tenant.auth0.com/login/callback`

### Issue: "Auth0Provider not available"
- **Solution**: Make sure your environment variables are set correctly
- Restart your development server after adding environment variables

### Issue: User not being created in database
- **Solution**: You may need to add logic to sync Auth0 users to your Supabase database
- Check the `addUserToLeglWorkspace` function in `useAuth.ts` - it currently only works with Supabase auth

## Production Deployment

When deploying to production:

1. Update your environment variables in your hosting platform (Netlify, Vercel, etc.)
2. Add your production domain to:
   - Auth0 **Allowed Callback URLs**
   - Auth0 **Allowed Logout URLs**
   - Auth0 **Allowed Web Origins**
   - Google Cloud Console **Authorized JavaScript origins**

3. Make sure your `.env` file is not committed to version control

## Additional Resources

- [Auth0 React SDK Documentation](https://auth0.com/docs/libraries/auth0-react)
- [Auth0 Google Social Connection Setup](https://auth0.com/docs/authenticate/identity-providers/social-identity-providers)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)

## Next Steps

After setting up Auth0:

1. Consider adding user profile management
2. Set up role-based access control (RBAC) if needed
3. Configure additional social providers if desired
4. Set up Auth0 Rules/Actions for custom user data handling
5. Integrate Auth0 user sync with your Supabase database if needed

