# Production Setup Guide for App Store Submission

## Environment Variables for Production

Update your `.env` file with production values:

```env
# Production Clerk Keys (get from Clerk Dashboard)
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...

# Production Backend URL
EXPO_PUBLIC_SERVER_URL=https://your-production-backend.vercel.app

# Database (should be production Neon DB)
DATABASE_URL=postgresql://...

# Production API Keys
NUTRITIONIX_API_KEY=your_production_key
NUTRITIONIX_APP_ID=your_production_app_id
GEMINI_API_KEY=your_production_key
```

## Pre-Build Checklist

### ✅ App Configuration

- [ ] Version number updated (currently 1.0.0)
- [ ] Build number set (currently 1)
- [ ] Bundle identifier confirmed (com.fortia.app)
- [ ] App icon and splash screen ready
- [ ] Privacy policy and terms of service URLs added

### ✅ Environment Variables

- [ ] Clerk production keys configured
- [ ] Production backend URL set
- [ ] All API keys are production-ready
- [ ] Database connection is production
      cd

### ✅ App Store Requirements

- [ ] App Store Connect account ready
- [ ] App metadata prepared (description, screenshots, etc.)
- [ ] Privacy policy URL available
- [ ] Support URL available

## Build Commands

### 1. Build for Production

```bash
eas build --platform ios --profile production
```

### 2. Submit to App Store

```bash
eas submit --platform ios --profile production
```

## Important Notes

1. **Test the production build** before submitting
2. **Ensure all features work** with production backend
3. **Verify OAuth flows** work with production Clerk
4. **Check all API integrations** work with production keys
5. **Test HealthKit permissions** thoroughly

## App Store Review Guidelines

- Ensure all privacy descriptions are accurate
- Test all user flows end-to-end
- Verify no test data or development URLs remain
- Check that all external links work
- Ensure app doesn't crash on any screen
