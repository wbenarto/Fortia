# 🚀 Seamless Development & Production Setup

## **Overview**

This setup allows you to develop locally with a local API server and deploy to production with the same codebase.

## **🏗️ Architecture**

### **Development Environment**

- **Expo App**: Points to `http://localhost:3000`
- **API Server**: Local Next.js server running on port 3000
- **Database**: Same Neon database (shared with production)

### **Production Environment**

- **Expo App**: Points to `https://fortia-9d3n33h1m-wbenartos-projects.vercel.app`
- **API Server**: Vercel serverless functions
- **Database**: Same Neon database

## **🛠️ Development Workflow**

### **Step 1: Start Local API Server**

```bash
cd ../fortia-api
npm run dev
```

**Expected output**: `Ready - started server on 0.0.0.0:3000`

### **Step 2: Start Expo App (Development Mode)**

```bash
cd Fortia
npx expo start --dev-client
```

**Environment**: Uses `EXPO_PUBLIC_SERVER_URL=http://localhost:3000`

### **Step 3: Make API Changes**

- Edit files in `../fortia-api/src/app/api/`
- Changes are immediately available at `http://localhost:3000/api/`
- Test with: `curl http://localhost:3000/api/test`

### **Step 4: Deploy to Production**

```bash
cd ../fortia-api
npx vercel --prod
```

## **🌍 Environment Variables**

### **Development (EAS)**

```
EXPO_PUBLIC_SERVER_URL=http://localhost:3000
```

### **Preview (EAS)**

```
EXPO_PUBLIC_SERVER_URL=https://fortia-9d3n33h1m-wbenartos-projects.vercel.app
```

### **Production (EAS)**

```
EXPO_PUBLIC_SERVER_URL=https://fortia-9d3n33h1m-wbenartos-projects.vercel.app
```

## **📱 App Builds**

### **Development Build**

```bash
npx eas-cli@latest build --platform ios --profile development
```

### **Production Build**

```bash
npx eas-cli@latest build --platform ios --profile production
```

## **🔧 API Development**

### **File Structure**

```
fortia-api/
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── test/route.ts          ← Test endpoint
│   │       ├── data-consent/route.ts  ← Consent management
│   │       ├── privacy-consent/route.ts
│   │       ├── meals/route.ts         ← Meal tracking
│   │       ├── activities/route.ts    ← Activity tracking
│   │       └── ...
│   └── lib/
│       └── dateUtils.ts               ← Shared utilities
```

### **Adding New API Routes**

1. Create new file: `src/app/api/your-endpoint/route.ts`
2. Export `GET` and/or `POST` functions
3. Test locally: `curl http://localhost:3000/api/your-endpoint`
4. Deploy: `npx vercel --prod`

## **🧪 Testing**

### **Local API Testing**

```bash
# Test basic functionality
curl http://localhost:3000/api/test

# Test with data
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### **App Testing**

- Use Expo Go or development build
- All API calls will go to localhost:3000
- Check console logs for API call URLs

## **🚀 Deployment Workflow**

### **1. Develop Locally**

```bash
# Terminal 1: API Server
cd ../fortia-api && npm run dev

# Terminal 2: Expo App
cd Fortia && npx expo start
```

### **2. Test Changes**

- Test all features in the app
- Verify API endpoints work
- Check database operations

### **3. Deploy API**

```bash
cd ../fortia-api
npx vercel --prod
```

### **4. Build Production App**

```bash
cd Fortia
npx eas-cli@latest build --platform ios --profile production
```

### **5. Submit to TestFlight**

```bash
npx eas-cli@latest submit --platform ios --latest
```

## **🔍 Troubleshooting**

### **API Not Responding**

- Check if API server is running: `curl http://localhost:3000/api/test`
- Restart API server: `npm run dev`
- Check for TypeScript errors

### **App Can't Connect to API**

- Verify `EXPO_PUBLIC_SERVER_URL` is set correctly
- Check network connectivity
- Look for CORS issues

### **Database Connection Issues**

- Verify `DATABASE_URL` in `.env.local`
- Check Neon database status
- Ensure database schema is up to date

## **📋 Quick Commands**

### **Start Development**

```bash
# Terminal 1
cd ../fortia-api && npm run dev

# Terminal 2
cd Fortia && npx expo start
```

### **Deploy Changes**

```bash
cd ../fortia-api && npx vercel --prod
```

### **Build Production**

```bash
cd Fortia && npx eas-cli@latest build --platform ios --profile production
```

## **✅ Success Checklist**

- [ ] Local API server starts without errors
- [ ] Expo app connects to local API
- [ ] All app features work locally
- [ ] API changes are reflected immediately
- [ ] Production deployment works
- [ ] Production app works correctly
- [ ] TestFlight submission successful

---

**🎯 Goal**: Seamless development with local API + production deployment with same codebase
