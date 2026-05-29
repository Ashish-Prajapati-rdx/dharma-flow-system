# 🚀 Vercel पर Complete Deployment Guide

## Step 1: Repository को GitHub पर Push करें

```bash
# Terminal खोलें और project directory में जाएं
cd c:\Users\RDX\Coding\SIH projects\AyurSutra\dharma-flow-system

# Git initialize करें (अगर पहले से नहीं है)
git init
git add .
git commit -m "Initial commit for Vercel deployment"

# GitHub repo create करें और link करें
git remote add origin https://github.com/YOUR_USERNAME/dharma-flow-system.git
git branch -M main
git push -u origin main
```

---

## Step 2: MongoDB Setup करें

अगर आपके पास MongoDB नहीं है:

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) पर जाएं
2. Free Tier Account बनाएं
3. एक Cluster create करें
4. Username और Password set करें
5. Connection String copy करें (यह दिखेगा):
   ```
   mongodb+srv://username:password@cluster-name.mongodb.net/dharma-flow?retryWrites=true&w=majority
   ```

---

## Step 3: Vercel पर Deploy करें

### Option A: Dashboard से Deploy

1. [Vercel.com](https://vercel.com) पर जाएं
2. GitHub से Sign Up/Login करें
3. **"New Project"** पर क्लिक करें
4. अपना GitHub repository चुनें (`dharma-flow-system`)
5. **Import** करें
6. **Continue** पर क्लिक करें

### Option B: Vercel CLI से Deploy

```bash
# Vercel CLI install करें (अगर पहले से नहीं है)
npm install -g vercel

# Deploy करें
vercel
```

---

## Step 4: Environment Variables Add करें

**Vercel Dashboard में:**

1. आपके project पर जाएं
2. **Settings** → **Environment Variables** खोलें
3. ये variables add करें:

| Variable         | Value                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `MONGO_URI`      | `mongodb+srv://username:password@cluster.mongodb.net/dharma-flow?retryWrites=true&w=majority` |
| `JWT_SECRET`     | किसी बड़ी random string जैसे `your_super_secret_key_12345678901234567890`                     |
| `GEMINI_API_KEY` | आपकी Gemini API key ([यहाँ से get करें](https://ai.google.dev/))                              |
| `EMAIL_USER`     | आपका email जैसे `your_email@gmail.com`                                                        |
| `EMAIL_PASSWORD` | आपका email का app-specific password                                                           |
| `NODE_ENV`       | `production`                                                                                  |

**Gmail से App Password कैसे get करें:**

- [Google Account Security](https://myaccount.google.com/security) खोलें
- **2-Step Verification** enable करें
- **App passwords** section में app password generate करें

---

## Step 5: Build & Deploy करें

**Dashboard से:**

1. **Deploy** बटन दबाएं
2. या simply GitHub पर push करें - Vercel automatically deploy करेगा

**Terminal से:**

```bash
vercel --prod
```

---

## Step 6: Test करें

Deploy complete होने के बाद:

1. अपनी Vercel URL खोलें (जैसे `https://dharma-flow.vercel.app`)
2. Health check करने के लिए:

   ```
   https://dharma-flow.vercel.app/api/health
   ```

   यह दिखेगा:

   ```json
   { "status": "ok", "dbConnected": true }
   ```

3. Frontend को खोलें और login करें
4. All features test करें

---

## Important Notes

✅ **Frontend & Backend दोनों Vercel पर हैं**

- Frontend: `https://dharma-flow.vercel.app`
- Backend API: `https://dharma-flow.vercel.app/api`

⚠️ **Database Connection:**

- MongoDB को internet से accessible होना चाहिए
- Vercel IP address को MongoDB network access में allow करें
- Settings → Network Access → Allow Access from Anywhere (0.0.0.0/0)

📝 **Environment Variables:**

- Production में variables को securely रखें
- Git में `.env` file को never commit न करें

🔄 **Auto-Deployment:**

- GitHub पर push करते ही Vercel automatically deploy करेगा

---

## Troubleshooting

### Issue: "MONGO_URI is not defined"

**Solution:** Vercel Dashboard में environment variable check करें

### Issue: "Cannot connect to MongoDB"

**Solution:** MongoDB Atlas में IP whitelisting check करें (Allow from anywhere करें)

### Issue: "CORS error"

**Solution:** api/index.ts में origin properly set है

### Issue: Chatbot काम नहीं कर रहा

**Solution:** GEMINI_API_KEY सही है या नहीं check करें

---

## Next Steps (Optional)

- **Custom Domain Add करें:** Vercel Dashboard → Settings → Domains
- **SSL Certificate:** Automatic (Vercel provide करता है)
- **Analytics:** Vercel Dashboard में देखें

---

## Files Changed for Deployment

- `vercel.json` - Vercel configuration
- `api/index.ts` - Serverless function
- `.vercelignore` - Files to ignore
- `.env.example` - Environment variables template
- `server/package.json` - Added @vercel/node dependency

---

**Happy Deployment! 🎉**
