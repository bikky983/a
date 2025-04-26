# NEPSE Stock Screener

A web application for screening and tracking stocks in the Nepal Stock Exchange (NEPSE).

## Features

- Real-time stock price tracking
- Support price calculations
- Stock watchlist management
- Multiple analysis tools
- Chart visualization

## Deployment Instructions

This application has been configured to deploy on Netlify as a serverless application.

### Prerequisites

- A GitHub account
- A Netlify account (free tier works fine)

### Deployment Steps

1. **Create a new GitHub repository**
   - Go to GitHub and create a new repository
   - Clone the repository to your local machine
   - Copy all files from this project into your local repository

2. **Push the code to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

3. **Set up Netlify**
   - Create a Netlify account at https://app.netlify.com/ (you can sign up with your GitHub account)
   - Click "New site from Git"
   - Select GitHub and authorize Netlify
   - Select your repository
   - Configure the deployment settings:
     - Build command: leave blank
     - Publish directory: `public`
   - Click "Deploy site"

4. **Your site is live!**
   - Netlify will automatically build and deploy your site
   - You can access it at the URL provided by Netlify

## Local Development

To run the application locally:

```bash
npm install -g netlify-cli
netlify dev
```

This will start a local development server with the serverless functions.

## Customization

- The application is fully configurable through the web interface
- Data is stored in your browser's localStorage
- No database setup is required 