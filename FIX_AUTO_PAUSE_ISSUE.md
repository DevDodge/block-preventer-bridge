# إصلاح مشكلة Auto-Pause

## المشكلة

إذا كنت تواجه المشكلة التالية:
- ✗ البروفايلات تتوقف تلقائياً رغم التحديثات
- ✗ رسالة خطأ: `"No active profiles available in this package"`
- ✗ Alerts تظهر: "Profile Auto-Paused"
- ✗ الرسائل لا تُرسل إلى Zentra/WhatsApp

**السبب:** الباقات (Packages) التي تم إنشاؤها **قبل** التحديث لا تزال لديها `auto_pause_on_failures = True` في قاعدة البيانات.

---

## الحل السريع

### الطريقة 1: استخدام Migration Script (موصى به)

قم بتشغيل الـ script التالي لتحديث جميع الباقات والبروفايلات تلقائياً:

```bash
cd bpb-complete-project/block-preventer-bridge/backend

# تأكد من تفعيل virtual environment
source venv/bin/activate  # Linux/Mac
# أو: venv\Scripts\activate  # Windows

# تشغيل الـ script
python fix_auto_pause.py
```

**ماذا يفعل الـ Script:**
1. ✅ يعطّل `auto_pause_on_failures` لجميع الباقات
2. ✅ يستأنف جميع البروفايلات المتوقفة تلقائياً
3. ✅ يعرض تقرير مفصل بالتغييرات

**مثال على الناتج:**
```
🔧 Starting migration: Disabling auto_pause_on_failures for all packages...
📦 Found 2 package(s)
  ⚙️  Updating package: My Package (ID: be5ca2ae-141c-485a-96d0-ec4dfbbadd7d)
  ✅ Package already updated: Test Package (ID: ...)

✅ Successfully updated 1 package(s)

🔄 Checking for auto-paused profiles...
📋 Found 2 paused profile(s)
  🔓 Resuming profile: Octobot Notification (ID: ...)
  🔓 Resuming profile: OCTOBOT (ID: ...)

✅ Successfully resumed 2 auto-paused profile(s)

🎉 Migration completed successfully!
```

---

### الطريقة 2: التحديث اليدوي عبر UI

إذا كنت تفضل التحديث اليدوي:

#### خطوة 1: تعطيل Auto-Pause للباقة

1. اذهب إلى **Packages**
2. افتح تفاصيل الباقة
3. اذهب إلى **Settings** أو **Edit Package**
4. ابحث عن `Auto-Pause on Failures`
5. قم بتعطيله (اجعله `False` أو `Off`)
6. احفظ التغييرات

#### خطوة 2: استئناف البروفايلات المتوقفة

1. اذهب إلى **Profiles**
2. ابحث عن البروفايلات في حالة "Paused"
3. لكل بروفايل متوقف:
   - اضغط على **Resume** أو **Activate**
   - أو غيّر Status إلى "Active"

---

## التحقق من الإصلاح

بعد تطبيق الحل، تحقق من:

### 1. فحص حالة الباقة

```bash
curl http://localhost:8000/api/v1/packages/be5ca2ae-141c-485a-96d0-ec4dfbbadd7d
```

يجب أن يكون:
```json
{
  "auto_pause_on_failures": false
}
```

### 2. فحص البروفايلات

```bash
curl http://localhost:8000/api/v1/packages/be5ca2ae-141c-485a-96d0-ec4dfbbadd7d/profiles
```

يجب أن تكون جميع البروفايلات:
```json
{
  "status": "active"
}
```

### 3. اختبار إرسال رسالة

```bash
curl -X POST "http://localhost:8000/api/v1/packages/be5ca2ae-141c-485a-96d0-ec4dfbbadd7d/messages/open" \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "text",
    "content": "Test message after fix",
    "recipients": ["+201012345678"]
  }'
```

يجب أن تحصل على:
```json
{
  "id": "...",
  "status": "queued",
  "total_recipients": 1
}
```

---

## بعد الإصلاح

### 1. إعادة تشغيل Backend

```bash
# أوقف Backend (Ctrl+C)
# ثم أعد تشغيله
uvicorn app.main:app --reload --port 8000
```

### 2. تنظيف Alerts القديمة

1. اذهب إلى صفحة **Alerts**
2. اضغط **Mark All Read**
3. هذا سيخفي جميع التنبيهات القديمة

### 3. مراقبة الرسائل

1. اذهب إلى **Messages**
2. اضغط **Queue View**
3. راقب الرسائل وهي تُرسل بنجاح

---

## الوقاية من المشكلة مستقبلاً

### عند إنشاء باقة جديدة

تأكد من أن `auto_pause_on_failures` معطّل (False) افتراضياً. التحديث الجديد يضمن ذلك، لكن للتأكد:

```python
# في Package model (backend/app/models/models.py)
auto_pause_on_failures = Column(Boolean, default=False)  # ✅ False
```

### مراقبة Alerts

بدلاً من الاعتماد على Auto-Pause:
1. راقب صفحة **Alerts** بانتظام
2. عند ظهور Alert حرج (Critical):
   - افحص البروفايل
   - تحقق من Zentra API Token
   - أوقف البروفايل **يدوياً** إذا لزم الأمر

---

## الأسئلة الشائعة

### Q: هل سيتم توقيف البروفايلات تلقائياً مرة أخرى؟

**A:** لا، بعد تطبيق الإصلاح، لن تتوقف البروفايلات تلقائياً. سيتم إنشاء Alerts فقط لتنبيهك.

### Q: ماذا لو أردت تفعيل Auto-Pause مرة أخرى؟

**A:** يمكنك تفعيله من إعدادات الباقة في الـ UI، لكن **غير موصى به** للإنتاج.

### Q: هل يمكنني حذف الـ Alerts القديمة؟

**A:** نعم، اضغط **Mark All Read** في صفحة Alerts، أو احذفها يدوياً.

### Q: الـ Script لا يعمل - ماذا أفعل؟

**A:** تحقق من:
1. أن `DATABASE_URL` موجود في `.env`
2. أن virtual environment مفعّل
3. أن قاعدة البيانات تعمل
4. استخدم الطريقة اليدوية (الطريقة 2) بدلاً من ذلك

---

## الدعم

إذا استمرت المشكلة بعد تطبيق الحل:

1. تحقق من logs الـ Backend:
   ```bash
   # في terminal الـ Backend
   # ابحث عن رسائل مثل:
   # "Profile auto-paused due to block detection"
   ```

2. تحقق من قاعدة البيانات مباشرة:
   ```sql
   SELECT id, name, auto_pause_on_failures FROM packages;
   SELECT id, name, status, pause_reason FROM profiles WHERE status = 'paused';
   ```

3. راجع ملف `PRODUCTION_READY_GUIDE.md` للمزيد من Troubleshooting

---

**آخر تحديث:** 9 فبراير 2026  
**الإصدار:** 1.0.1
