# 🚀 دليل البدء السريع - Whats Guard

**الوقت المتوقع:** 10 دقائق

---

## الخطوة 1: تثبيت المتطلبات

تأكد من تثبيت:
- Python 3.11+
- Node.js 18+
- PostgreSQL أو MySQL
- pnpm (`npm install -g pnpm`)

---

## الخطوة 2: إعداد قاعدة البيانات

### PostgreSQL:
```bash
psql -U postgres
CREATE DATABASE block_preventer_bridge;
\q
```

### MySQL:
```bash
mysql -u root -p
CREATE DATABASE block_preventer_bridge;
exit;
```

---

## الخطوة 3: تشغيل Backend

```bash
cd bpb-complete-project/block-preventer-bridge/backend

# إنشاء virtual environment
python3.11 -m venv venv
source venv/bin/activate  # Linux/Mac
# أو: venv\Scripts\activate  # Windows

# تثبيت المكتبات
pip install -r requirements.txt

# إنشاء ملف .env
cp .env.example .env
# عدّل DATABASE_URL في .env

# تشغيل Backend
uvicorn app.main:app --reload --port 8000
```

✅ Backend جاهز على: `http://localhost:8000`

---

## الخطوة 4: تشغيل Frontend

**في terminal جديد:**

```bash
cd bpb-complete-project/bpb-frontend

# تثبيت المكتبات
pnpm install

# تشغيل Frontend
pnpm dev
```

✅ Frontend جاهز على: `http://localhost:5173`

---

## الخطوة 5: إنشاء أول Package

1. افتح `http://localhost:5173`
2. اذهب إلى **Packages**
3. اضغط **Create Package**
4. املأ:
   - **Name:** My First Package
   - **Description:** Test package
   - **Distribution Mode:** round_robin
5. اضغط **Create**

---

## الخطوة 6: إضافة Profile

1. افتح Package Details
2. اضغط **Add Profile**
3. املأ:
   - **Name:** Profile 1
   - **Phone Number:** +201234567890
   - **Zentra UUID:** your-zentra-uuid
   - **Zentra API Token:** your-api-token
4. اضغط **Add**

---

## الخطوة 7: إرسال أول رسالة

1. اذهب إلى **Messages**
2. اختر Package
3. اضغط **Send Message**
4. املأ:
   - **Recipients:** +201234567890
   - **Content:** Hello from Whats Guard!
5. اضغط **Send**

---

## الخطوة 8: متابعة الحالة

1. في صفحة Messages، اضغط **Queue View**
2. شاهد الرسالة مع countdown timer
3. بعد الإرسال، اضغط **History** لرؤية النتيجة

---

## ✅ تم!

المنصة الآن تعمل بشكل كامل.

### الخطوات التالية:
- راجع **PRODUCTION_READY_GUIDE.md** للتفاصيل الكاملة
- راجع **API Documentation** على `http://localhost:8000/docs`
- راجع **CHANGELOG.md** لمعرفة التحسينات المطبقة

---

## 🆘 مشاكل شائعة

### Backend لا يعمل
```bash
# تحقق من قاعدة البيانات
psql -U postgres -d block_preventer_bridge -c "SELECT 1;"

# تحقق من .env
cat backend/.env
```

### Frontend لا يعمل
```bash
# تحقق من Backend
curl http://localhost:8000/health

# أعد تثبيت المكتبات
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### الرسائل لا تُرسل
1. تحقق من أن Background Processor يعمل:
   ```bash
   curl http://localhost:8000/health
   ```
2. تحقق من Queue في UI
3. تحقق من Zentra API Token

---

## 📞 الدعم

للمزيد من المساعدة، راجع:
- `PRODUCTION_READY_GUIDE.md` - دليل شامل
- `PRODUCTION_FIXES.md` - تحليل المشاكل والحلول
- `http://localhost:8000/docs` - API Documentation
