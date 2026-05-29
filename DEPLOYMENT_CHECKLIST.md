# ✅ Vercel Deployment Checklist

## Pre-Deployment (Local में)

- [ ] सभी code locally काम कर रहा है

  ```bash
  npm run dev:client    # Frontend check करें
  npm run dev:server    # Backend check करें
  ```

- [ ] Environment variables set हैं (local `.env` में)

  ```bash
  MONGO_URI=your_mongodb_url
  JWT_SECRET=your_secret
  GEMINI_API_KEY=your_key
  EMAIL_USER=your_email
  EMAIL_PASSWORD=your_password
  ```

- [ ] `.env` file को git में add न करें (पहले से `.gitignore` में है)

- [ ] Build test करें:
  ```bash
  npm run build
  ```

---

## GitHub Repo Setup

- [ ] Repository को GitHub पर create करें
- [ ] Code को push करें:
  ```bash
  git init
  git add .
  git commit -m "Initial commit"
  git remote add origin https://github.com/YOUR_USERNAME/dharma-flow-system.git
  git branch -M main
  git push -u origin main
  ```

---

## MongoDB Setup

- [ ] MongoDB Atlas account बनाएं: https://www.mongodb.com/cloud/atlas
- [ ] Free Tier cluster create करें
- [ ] Database user create करें (username + password)
- [ ] Connection string copy करें
- [ ] Network Access → "Allow Access from Anywhere" (production के लिए)

---

## Vercel Setup

- [ ] Vercel account बनाएं: https://vercel.com
- [ ] GitHub से login/signup करें

### Project Import करें

- [ ] **New Project** click करें
- [ ] अपना GitHub repository (`dharma-flow-system`) select करें
- [ ] **Import** करें

### Environment Variables Add करें

**Vercel Dashboard → Project Settings → Environment Variables**

Add करें:

```
MONGO_URI = mongodb+srv://user:password@cluster.mongodb.net/dharma-flow
JWT_SECRET = your_secret_key_here
GEMINI_API_KEY = your_gemini_key
EMAIL_USER = your_email@gmail.com
EMAIL_PASSWORD = your_app_password
NODE_ENV = production
```

**Gmail App Password कैसे generate करें:**

1. https://myaccount.google.com/security
2. 2-Step Verification enable करें (अगर नहीं है)
3. "App passwords" section में जाएं
4. "Mail" और "Windows Computer" select करें
5. Password copy करें और EMAIL_PASSWORD में paste करें

---

## Deploy करें

### Option 1: Dashboard से

- [ ] Dashboard में "Deploy" button दबाएं

### Option 2: Git से

- [ ] Simply `git push` करें - Vercel automatically deploy करेगा
- [ ] https://dashboard.vercel.com/deployments में status check करें

---

## Post-Deployment Testing

- [ ] Vercel URL खोलें (जैसे https://dharma-flow.vercel.app)

- [ ] Health Check करें:

  ```
  https://dharma-flow.vercel.app/api/health
  ```

  Expected response: `{"status":"ok","dbConnected":true}`

- [ ] Frontend loaded हो
  - [ ] Login page दिखाई दे
  - [ ] Styling सही हो

- [ ] Login functionality:
  - [ ] Doctor account से login करें
  - [ ] Patient account से login करें

- [ ] Core Features:
  - [ ] Doctor: Appointments create कर सकें
  - [ ] Patient: Appointments देख सकें
  - [ ] Chatbot काम कर रहा हो

- [ ] Check Logs:
  ```
  Vercel Dashboard → Deployments → View Logs
  ```

---

## Issues & Solutions

### ❌ "Cannot find module" error

✅ सभी dependencies installed हैं? `npm install` करें

### ❌ "MONGO_URI not defined"

✅ Environment variables को Vercel Dashboard में verify करें

### ❌ "MongoDB connection timeout"

✅ MongoDB Atlas में "Allow Access from Anywhere" enable करें

### ❌ "CORS error"

✅ api/index.ts में origin configuration check करें

### ❌ "Chatbot not working"

✅ GEMINI_API_KEY सही है?

### ❌ "Email not sending"

✅ Gmail app password सही है? 2FA enabled है?

---

## Production Optimization (Optional)

- [ ] Custom domain setup करें (vercel.com/docs)
- [ ] Vercel Analytics enable करें
- [ ] Error tracking (Sentry) setup करें
- [ ] Database backups configure करें
- [ ] Environment-specific logging setup करें

---

## Deployment Complete! 🎉

अब आपका project production में है!

**URLs:**

- Frontend: `https://your-domain.vercel.app`
- Backend API: `https://your-domain.vercel.app/api`
- Health Check: `https://your-domain.vercel.app/api/health`

---

## Important Notes

⚠️ **Security:**

- Production में sensitive data को secrets में रखें
- Database backups regular करें
- SSL certificates (Vercel automatic करता है)

🔄 **Updates:**

- सभी updates GitHub पर push करें
- Vercel automatically deploy करेगा
- Vercel Dashboard में status check करें

📊 **Monitoring:**

- Vercel Analytics देखते रहें
- Error logs को monitor करें
- Database performance check करें

---

Questions? मुझसे पूछें! 🚀
