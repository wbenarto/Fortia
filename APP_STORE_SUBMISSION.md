# App Store Submission Guide for Fortia

This guide documents the complete process of submitting the Fortia app to the Apple App Store, including the steps we just completed and what you need to do next.

## 🎯 Overview

We successfully submitted Fortia (version 1.0.0, build 4) to the Apple App Store using Expo Application Services (EAS). The app is now being processed by Apple and ready for review.

## 📋 Prerequisites Completed

### ✅ Apple Developer Account

### ✅ Environment Variables (EAS Secrets)

All sensitive environment variables are securely stored using EAS Secrets:

### ✅ App Configuration

- **App Name**: Fortia
- **Bundle Identifier**: com.fortia.app
- **Version**: 1.0.0
- **Platform**: iOS
- **Permissions**: Motion/Fitness, Microphone (optional)

## 🚀 Steps We Just Completed

### Step 1: Production Build

```bash
npx eas-cli@latest build --platform ios --profile production
```

**What happened:**

- ✅ Incremented build number from 3 to 4
- ✅ Used remote iOS credentials (Expo server)
- ✅ Authenticated with Apple Developer account
- ✅ Generated distribution certificates and provisioning profiles
- ✅ Built production-ready iOS app (.ipa file)
- ✅ Uploaded to EAS servers

**Build Details:**

- **Build ID**:
- **App Version**: 1.0.0
- **Build Number**: 4
- **Distribution Certificate**:
- **Provisioning Profile**:

### Step 2: App Store Submission

```bash
npx eas-cli@latest submit --platform ios --latest
```

**What happened:**

- ✅ Connected to App Store Connect
- ✅ Registered bundle identifier
- ✅ Set up App Store Connect API Key
- ✅ Uploaded binary to Apple
- ✅ Scheduled submission for processing

**Submission Details:**

- **ASC App ID**:
- **Project ID**:
- **API Key ID**:
- **Submission ID**:

## 📱 Current Status

### ✅ Completed

- [x] Production build created
- [x] Binary uploaded to App Store Connect
- [x] Submission scheduled for processing

### ⏳ In Progress

- [ ] Apple processing binary (5-10 minutes)
- [ ] App Store Connect setup required
- [ ] App review submission pending

### 🔄 Next Steps Required

- [ ] Complete App Store Connect information
- [ ] Upload screenshots and metadata
- [ ] Submit for App Store review

## 🧪 TestFlight Setup (For Friends Testing)

### What is TestFlight?

TestFlight is Apple's beta testing platform that allows you to distribute your app to testers before it goes live on the App Store. This is perfect for getting feedback from friends and family.

### ✅ Current Status

Since we already submitted your app to App Store Connect, it should be available for TestFlight once Apple finishes processing (5-10 minutes).

### Step 1: Access TestFlight in App Store Connect

1. **Go to App Store Connect**: https://appstoreconnect.apple.com
2. **Login**:
3. **Select your app**: Fortia
4. **Click "TestFlight"** in the left sidebar

### Step 2: Wait for Processing

- Your build (1.0.0, Build 4) is currently being processed by Apple
- This usually takes 5-10 minutes
- You'll see it appear in the "Processing" section first
- Once complete, it moves to "Ready to Test"

### Step 3: Add Testers

Once your build is "Ready to Test":

#### Option A: Internal Testers (Up to 100 people)

1. **Click "Internal Testing"**
2. **Click the "+" button** to add testers
3. **Add testers by email** (they must have Apple IDs)
4. **Select your build** (1.0.0, Build 4)
5. **Click "Save"**

#### Option B: External Testers (Up to 10,000 people)

1. **Click "External Testing"**
2. **Click "Create a new group"**
3. **Name your group** (e.g., "Friends & Family")
4. **Add testers by email**
5. **Select your build**
6. **Submit for Beta App Review** (required for external testers)

### Step 4: Invite Friends

Your friends will receive an email invitation with:

- **TestFlight app download link**
- **Instructions to install TestFlight**
- **Your app's unique invitation code**

### Step 5: Friends Install TestFlight

Your friends need to:

1. **Download TestFlight** from the App Store
2. **Open the invitation email**
3. **Tap the invitation link**
4. **Install your app** through TestFlight

### ⚡ Quick Start for Friends Testing

**For immediate testing with friends:**

1. **Check App Store Connect** in 5-10 minutes
2. **Go to TestFlight section**
3. **Add friends' email addresses** to Internal Testing
4. **They'll get instant access** (no review required for internal testers)

### 📋 TestFlight Requirements

#### For Internal Testers (Recommended for Friends)

- ✅ **No review required** - Instant access
- ✅ **Up to 100 testers**
- ✅ **Must have Apple ID** (email address)
- ✅ **Testers get email invitation**

#### For External Testers

- ⏳ **Requires Beta App Review** (1-2 days)
- ✅ **Up to 10,000 testers**
- ✅ **Public link available**
- ✅ **More detailed review process**

### 🔧 Troubleshooting TestFlight

#### Build Not Appearing

- **Wait 5-10 minutes** for Apple processing
- **Check "Processing" section** in TestFlight
- **Refresh the page** periodically

#### Friends Can't Install

- **Verify email addresses** are correct
- **Check spam folders** for invitations
- **Ensure friends have Apple IDs**
- **Testers need iOS 8.0 or later**

#### App Crashes in TestFlight

- **Check crash logs** in App Store Connect
- **Test on different devices**
- **Verify environment variables** are set correctly

### 📱 TestFlight App Features

#### What Testers Can Do

- **Install and test your app**
- **Submit feedback** through TestFlight
- **Report bugs** directly to you
- **Access multiple builds** if available

#### What You Can Do

- **Monitor crash reports**
- **View tester feedback**
- **Push new builds** to testers
- **Remove testers** if needed

## 🛠️ App Store Connect Setup (Required)

### 1. Access App Store Connect

- **URL**: https://appstoreconnect.apple.com
- **Login**: webe_90@yahoo.com
- **App**: Fortia (com.fortia.app)

### 2. Complete Required Information

#### App Information

- **App Name**: Fortia
- **Subtitle**: Brief description (30 characters max)
- **Category**: Health & Fitness
- **Content Rights**: Confirm you own all content

#### Pricing

- **Price**: Free or Paid (set your pricing tier)
- **Availability**: Select countries/regions

#### App Review Information

- **Contact Information**: Your email/phone for reviewers
- **Demo Account**: If app requires login
- **Notes**: Any special instructions for reviewers

#### Version Information (1.0.0)

- **What's New in This Version**: Release notes
- **Keywords**: Search terms (100 characters max)
- **App Description**: Detailed app description
- **Screenshots**: **REQUIRED** (at least 1, up to 10)
  - iPhone 6.7" Display (1290 x 2796)
  - iPhone 6.5" Display (1242 x 2688)
  - iPhone 5.5" Display (1242 x 2208)
- **App Preview Videos**: Optional (up to 3 videos)

### 3. Screenshot Requirements

**Minimum Requirements:**

- At least 1 screenshot per device size
- High-quality images (no blurry screenshots)
- Show key app features
- No personal information visible

**Recommended Screenshots:**

1. Home screen with activity summary
2. Meal logging interface
3. Workout tracking
4. Progress charts
5. Settings/profile

## 📋 App Store Review Process

### Timeline

- **Processing**: 5-10 minutes (current)
- **Review**: 1-7 days (typical)
- **Total**: 1-8 days

### What Apple Reviews

- **Functionality**: App works as described
- **UI/UX**: Follows Apple's design guidelines
- **Content**: Appropriate for App Store
- **Performance**: No crashes or major bugs
- **Privacy**: Proper privacy practices
- **Legal**: Complies with App Store guidelines

### Common Rejection Reasons

- **Crashes**: App crashes during testing
- **Missing Information**: Incomplete app description
- **Broken Features**: Non-functional features
- **Privacy Issues**: Missing privacy policy
- **Design Issues**: Poor UI/UX

## 🔄 Future Updates

### For App Updates

1. **Update code** in your project
2. **Increment version** in `app.config.js` (optional, auto-increment is enabled)
3. **Build new version**:
   ```bash
   npx eas-cli@latest build --platform ios --profile production
   ```
4. **Submit new version**:
   ```bash
   npx eas-cli@latest submit --platform ios --latest
   ```

### Version Management

- **Auto-increment**: Enabled in `eas.json`
- **Version**: Managed in `app.config.js`
- **Build Number**: Automatically incremented by EAS

## 🛡️ Security Best Practices

### Environment Variables

- ✅ **EAS Secrets**: All sensitive data stored securely
- ✅ **No Hardcoding**: No API keys in source code
- ✅ **Production Ready**: Separate from development

### App Security

- ✅ **Authentication**: Clerk integration
- ✅ **Data Privacy**: User consent management
- ✅ **API Security**: Rate limiting implemented

## 📞 Support & Resources

### Useful Links

- **App Store Connect**: https://appstoreconnect.apple.com
- **EAS Dashboard**: https://expo.dev/accounts/wbenarto/projects/fortia
- **Build Logs**: https://expo.dev/accounts/wbenarto/projects/fortia/builds
- **Submission Status**: https://expo.dev/accounts/wbenarto/projects/fortia/submissions

### Documentation

- **EAS Build**: https://docs.expo.dev/build/introduction/
- **EAS Submit**: https://docs.expo.dev/submit/introduction/
- **App Store Guidelines**: https://developer.apple.com/app-store/review/guidelines/

## 🎉 Success Checklist

### Before Submission

- [x] Production build successful
- [x] Environment variables configured
- [x] App permissions properly set
- [x] No debug code in production
- [x] App tested thoroughly

### After Submission

- [x] Binary uploaded to App Store Connect
- [x] Submission scheduled for processing
- [ ] App Store Connect setup completed
- [ ] Screenshots and metadata uploaded
- [ ] App submitted for review
- [ ] Review completed and approved

## 📊 Current App Details

---

**Status**: ✅ Successfully submitted to App Store Connect  
**Next Action**: Complete App Store Connect setup and submit for review  
**Estimated Timeline**: 1-8 days for full approval
