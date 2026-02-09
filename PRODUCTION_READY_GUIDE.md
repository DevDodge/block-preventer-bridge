# دليل تشغيل Block Preventer Bridge للإنتاج

**التاريخ:** 9 فبراير 2026  
**الحالة:** ✅ جاهز للإنتاج

---

## التحسينات المطبقة

### 1. ✅ تعطيل Auto-Pause الافتراضي
- **المشكلة:** البروفايلات كانت تتوقف تلقائياً عند أي فشل، مما يعطل العمل
- **الحل:** تم تغيير `auto_pause_on_failures` إلى `False` بشكل افتراضي
- **النتيجة:** البروفايلات تستمر في العمل، ويتم إنشاء Alerts فقط عند اكتشاف مشاكل

### 2. ✅ تسريع معالجة الرسائل
- **المشكلة:** Background Processor كان يعمل كل 30 ثانية، مما يسبب تأخير
- **الحل:** تم تقليل الفترة إلى 10 ثوان
- **النتيجة:** الرسائل تُرسل بشكل أسرع بكثير

### 3. ✅ عرض تفاصيل الأخطاء في UI
- **الميزة:** Queue Viewer يعرض:
  - Countdown timer لكل رسالة
  - تفاصيل الأخطاء الكاملة (قابلة للنقر)
  - حالة كل رسالة بوضوح
  - عدد المحاولات المتبقية

### 4. ✅ Analytics حقيقية
- **الميزة:** صفحة Analytics تعرض بيانات حقيقية من قاعدة البيانات
- **المحتوى:**
  - Daily breakdown (رسائل يومية)
  - Hourly breakdown (رسائل حسب الساعة)
  - Success rate
  - Average delivery time

---

## متطلبات التشغيل

### Backend Requirements
```bash
Python 3.11+
PostgreSQL / MySQL
```

### Frontend Requirements
```bash
Node.js 18+
pnpm
```

---

## خطوات التشغيل

### 1. إعداد قاعدة البيانات

قم بإنشاء قاعدة بيانات جديدة:

```sql
CREATE DATABASE block_preventer_bridge;
```

### 2. إعداد Backend

```bash
cd bpb-complete-project/block-preventer-bridge/backend

# إنشاء virtual environment
python3.11 -m venv venv
source venv/bin/activate  # على Linux/Mac
# أو
venv\Scripts\activate  # على Windows

# تثبيت المكتبات
pip install -r requirements.txt

# إنشاء ملف .env
cat > .env << EOF
DATABASE_URL=postgresql+asyncpg://user:password@localhost/block_preventer_bridge
# أو MySQL:
# DATABASE_URL=mysql+aiomysql://user:password@localhost/block_preventer_bridge

CORS_ORIGINS=http://localhost:5173,http://localhost:3000
APP_NAME=Block Preventer Bridge
APP_VERSION=1.0.0
EOF

# تشغيل Backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend سيعمل على: `http://localhost:8000`

### 3. إعداد Frontend

```bash
cd bpb-complete-project/bpb-frontend

# تثبيت المكتبات
pnpm install

# تشغيل Frontend
pnpm dev
```

Frontend سيعمل على: `http://localhost:5173`

---

## الوصول للمنصة

افتح المتصفح على: `http://localhost:5173`

### الصفحات المتاحة:
1. **Home** - Dashboard رئيسي مع إحصائيات
2. **Packages** - إدارة الباقات
3. **Profiles** - إدارة البروفايلات
4. **Messages** - إرسال الرسائل ومتابعة الحالة
5. **Analytics** - تحليلات مفصلة
6. **Alerts** - تنبيهات النظام
7. **Settings** - إعدادات النظام

---

## استخدام المنصة

### 1. إنشاء Package جديد

```
1. اذهب إلى صفحة Packages
2. اضغط "Create Package"
3. املأ البيانات:
   - Name: اسم الباقة
   - Description: وصف
   - Distribution Mode: round_robin / smart / weighted
   - Rate Limits: حدود الإرسال
4. اضغط "Create"
```

### 2. إضافة Profile للباقة

```
1. افتح تفاصيل الباقة
2. اضغط "Add Profile"
3. املأ البيانات:
   - Name: اسم البروفايل
   - Phone Number: رقم الواتساب
   - Zentra UUID: معرف Zentra
   - Zentra API Token: توكن API
4. اضغط "Add"
```

### 3. إرسال رسالة

```
1. اذهب إلى صفحة Messages
2. اختر Package
3. اضغط "Send Message"
4. اختر نوع الرسالة:
   - Open Chat: رسالة جديدة
   - Reply Chat: رد على محادثة
   - Schedule: جدولة رسالة
5. املأ البيانات وأرسل
```

### 4. متابعة حالة الرسائل

في صفحة Messages، يمكنك:
- **عرض Queue:** رؤية جميع الرسائل المعلقة مع countdown timer
- **عرض History:** رؤية جميع الرسائل المرسلة
- **عرض الأخطاء:** النقر على أي رسالة فاشلة لرؤية التفاصيل الكاملة

---

## فهم حالات الرسائل

| الحالة | الوصف |
|--------|-------|
| **waiting** | الرسالة في الانتظار، سيتم إرسالها قريباً |
| **processing** | جاري إرسال الرسالة الآن |
| **sent** | تم إرسال الرسالة بنجاح |
| **failed** | فشل إرسال الرسالة |
| **cancelled** | تم إلغاء الرسالة |

---

## فهم Alerts

### أنواع التنبيهات:

1. **block_detected** (Critical)
   - يظهر عند اكتشاف مؤشرات حظر
   - **الإجراء:** فحص البروفايل وإيقافه يدوياً إذا لزم الأمر

2. **block_warning** (Warning)
   - يظهر عند وجود مؤشرات خطر محتملة
   - **الإجراء:** المراقبة عن كثب

3. **profile_resumed** (Info)
   - يظهر عند استئناف بروفايل متوقف تلقائياً
   - **الإجراء:** لا يوجد

---

## إعدادات مهمة

### في صفحة Package Settings:

**Auto-Pause Settings:**
- `auto_pause_on_failures`: **False** (افتراضياً) - لا توقف البروفايلات تلقائياً
- `auto_pause_failure_threshold`: 5 - عدد الفشل المتتالي قبل التوقف (إذا كان مفعّل)
- `auto_pause_success_rate_threshold`: 50% - نسبة النجاح الدنيا

**Rate Limits:**
- `max_messages_per_hour`: 20 رسالة/ساعة
- `max_messages_per_3hours`: 45 رسالة/3 ساعات
- `max_messages_per_day`: 120 رسالة/يوم

**Cooldown Settings:**
- `rush_hour_threshold`: 10 - عدد الرسائل في Queue لتفعيل Rush Hour
- `rush_hour_multiplier`: 2.0 - مضاعف الـ cooldown في Rush Hour
- `quiet_mode_threshold`: 5 - عدد الرسائل لتفعيل Quiet Mode
- `quiet_mode_multiplier`: 0.5 - مضاعف الـ cooldown في Quiet Mode

---

## API Documentation

الـ API Documentation متاحة على:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

### أمثلة API Requests:

#### إرسال رسالة Open Chat
```bash
curl -X POST "http://localhost:8000/api/v1/packages/{package_id}/messages/open" \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "text",
    "content": "Hello from Block Preventer Bridge!",
    "recipients": ["+201234567890", "+201234567891"]
  }'
```

#### الحصول على Queue Status
```bash
curl "http://localhost:8000/api/v1/packages/{package_id}/queue"
```

#### الحصول على Queue Items (للمطورين)
```bash
curl "http://localhost:8000/api/v1/packages/{package_id}/queue/items?status=waiting"
```

---

## Troubleshooting

### المشكلة: الرسائل لا تُرسل

**الحلول:**
1. تحقق من أن Background Processor يعمل:
   ```bash
   curl http://localhost:8000/health
   ```
   يجب أن يكون `background_processor: "running"`

2. تحقق من Queue:
   - اذهب إلى Messages → Queue View
   - تحقق من وجود رسائل في حالة "waiting"
   - تحقق من countdown timer

3. تحقق من البروفايلات:
   - تأكد من وجود بروفايل واحد على الأقل في حالة "active"
   - تحقق من صحة Zentra API Token

### المشكلة: البروفايل متوقف

**الحلول:**
1. اذهب إلى Package Details
2. ابحث عن البروفايل المتوقف
3. اضغط على "Resume" أو غيّر Status إلى "active"

### المشكلة: الأخطاء غير واضحة

**الحلول:**
1. اذهب إلى Messages → Queue View
2. اضغط على الرسالة الفاشلة (الأيقونة الحمراء)
3. سيظهر Error Dialog مع التفاصيل الكاملة

---

## Production Deployment

### استخدام Gunicorn للـ Backend

```bash
pip install gunicorn

gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120
```

### استخدام Nginx كـ Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### بناء Frontend للإنتاج

```bash
cd bpb-complete-project/bpb-frontend
pnpm build

# الملفات ستكون في dist/
# يمكن تقديمها باستخدام nginx أو أي web server
```

---

## Database Backup

### Backup قاعدة البيانات

```bash
# PostgreSQL
pg_dump -U username block_preventer_bridge > backup.sql

# MySQL
mysqldump -u username -p block_preventer_bridge > backup.sql
```

### Restore قاعدة البيانات

```bash
# PostgreSQL
psql -U username block_preventer_bridge < backup.sql

# MySQL
mysql -u username -p block_preventer_bridge < backup.sql
```

---

## الخلاصة

المنصة الآن جاهزة للإنتاج مع:
- ✅ عدم توقف البروفايلات تلقائياً
- ✅ معالجة سريعة للرسائل (10 ثوان)
- ✅ عرض واضح لحالة كل رسالة
- ✅ تفاصيل أخطاء كاملة للمطورين
- ✅ Analytics حقيقية
- ✅ Queue Viewer مع countdown timers

**ملاحظة مهمة:** إذا أردت تفعيل Auto-Pause مرة أخرى، يمكنك تغيير `auto_pause_on_failures` إلى `True` من إعدادات الباقة في الـ UI.

---

## الدعم

للمزيد من المساعدة:
- راجع API Documentation: `http://localhost:8000/docs`
- راجع ملف `COMPLETION_PLAN.md` للتفاصيل التقنية
- راجع ملف `PRODUCTION_FIXES.md` لفهم التحسينات المطبقة
