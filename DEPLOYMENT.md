# QRush Trivia Website Deployment Guide

## Overview
This guide will help you deploy the QRush Trivia business website to qrushtrivia.com for META business verification.

## Business Information Included
- **Business Name**: QRush Trivia
- **Business Address**: 6837 Yellowstone Blvd, Queens, NY 11375
- **Business Phone**: (773) 543-2202
- **Business Email**: admin@qrushtrivia.com
- **Domain**: qrushtrivia.com

## Deployment Options

### Option 1: Vercel (Recommended)
1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

3. Deploy to Vercel:
   ```bash
   npm run deploy
   ```

4. Configure custom domain in Vercel dashboard:
   - Go to your project settings
   - Add qrushtrivia.com as custom domain
   - Update DNS records as instructed by Vercel

### Option 2: Netlify
1. Build the project:
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy the `out` folder to Netlify
3. Configure custom domain in Netlify dashboard

### Option 3: Traditional Hosting
1. Build the project:
   ```bash
   cd frontend
   npm run build
   ```

2. Upload the `out` folder contents to your web server
3. Configure your web server to serve the static files

## DNS Configuration (Namesilo)
Configure these DNS records in your Namesilo account:

### For Vercel:
- **A Record**: @ → 76.76.19.19
- **CNAME**: www → cname.vercel-dns.com

### For Netlify:
- **A Record**: @ → 75.2.60.5
- **CNAME**: www → your-site.netlify.app

## META Business Verification
The website includes all required information for META business verification:
- ✅ Business address clearly displayed
- ✅ Business phone number visible
- ✅ Business email address provided
- ✅ Professional business website
- ✅ Contact form for inquiries
- ✅ SEO optimized with proper meta tags

## Website Features
- **Responsive Design**: Works on all devices
- **SEO Optimized**: Proper meta tags, sitemap, robots.txt
- **Contact Form**: Functional contact form
- **Business Information**: All required details prominently displayed
- **Professional Design**: Clean, modern business website

## Testing
After deployment, test the following:
1. Website loads at qrushtrivia.com
2. All business information is visible
3. Contact form is accessible
4. Mobile responsiveness works
5. SEO meta tags are present

## Admin Access
The admin dashboard is available at:
- `/admin/login` - Admin login
- `/admin/dashboard` - Admin dashboard

This is separate from the public business website and requires authentication.

## Support
For deployment issues, check:
1. DNS propagation (can take 24-48 hours)
2. SSL certificate status
3. Build logs for any errors
4. Domain configuration in hosting provider
