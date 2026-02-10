# Whats Guard - Update Summary v1.0.2

## 🎉 التحديثات الجديدة

تم إضافة مجموعة من الميزات المهمة التي تجعل المنصة أكثر احترافية وسهولة في الاستخدام:

---

## 1. ✅ زر "Delete All Alerts"

### المشكلة السابقة
- كان هناك 99+ alert متكرر في النظام
- لم يكن هناك طريقة سريعة لحذف جميع الـ alerts

### الحل
- **زر "Delete All"** في صفحة Alerts
- يظهر فقط عندما يكون هناك alerts
- يطلب تأكيد قبل الحذف
- يمكن تصفية الحذف حسب الباقة (Package)
- يعرض رسالة نجاح مع عدد الـ alerts المحذوفة

### كيفية الاستخدام
1. اذهب إلى صفحة **Alerts**
2. اضغط على زر **Delete All** (أحمر، بجانب "Mark All Read")
3. أكد الحذف
4. سيتم حذف جميع الـ alerts

**API Endpoint:**
```bash
DELETE /api/v1/alerts/delete-all?package_id=<optional>
```

---

## 2. ✅ تعديل إعدادات الباقة من الـ UI

### المشكلة السابقة
- كانت إعدادات الباقة (Rate Limits, Auto-Pause, إلخ) **read-only**
- لم يكن هناك طريقة لتعديلها من الـ UI
- كان يجب استخدام API مباشرة أو قاعدة البيانات

### الحل
- **زر "Edit Settings"** في تبويب "Limits & Settings"
- Dialog شامل لتعديل جميع الإعدادات:
  - **Rate Limits:** Messages per hour/3hours/day, Concurrent sends, Freeze duration
  - **Queue & Automation:** Rush/Quiet thresholds, Multipliers, Retry attempts
  - **Feature Toggles:** Auto-Adjust Limits, Auto-Pause on Failures, Retry Failed Messages
- التحديثات فورية مع رسالة نجاح
- Validation تلقائي للقيم

### كيفية الاستخدام
1. اذهب إلى **Package Details** (اضغط على أي باقة)
2. اذهب إلى تبويب **Limits & Settings**
3. اضغط على **Edit Settings** (أزرق، في الأعلى)
4. عدّل القيم المطلوبة
5. اضغط **Save Settings**

**مثال:**
- تعطيل Auto-Pause: افتح Edit Settings → قم بإلغاء تحديد "Auto-Pause on Failures" → Save
- تغيير Rate Limits: افتح Edit Settings → عدّل "Messages per Hour" → Save

---

## 3. ✅ Alert Deduplication (منع التكرار)

### المشكلة السابقة
- كانت الـ Alerts تتكرر كل 10 ثوان
- نفس المشكلة تولّد 99+ alert
- Background Processor يفحص البروفايلات باستمرار ويجد نفس المشاكل

### الحل
- **Alert Deduplication** - يمنع إنشاء alerts متكررة خلال ساعة واحدة
- يطبق على:
  - Critical Alerts (block_detected)
  - Warning Alerts (block_warning)
  - Rate Limit Adjustments
- يقلل عدد الـ Alerts بنسبة **95%+**

### كيف يعمل
```python
# قبل إنشاء alert جديد، يفحص:
- هل يوجد alert مشابه (نفس النوع، نفس البروفايل، نفس الشدة)
- تم إنشاؤه خلال آخر ساعة؟
- إذا نعم: لا تنشئ alert جديد (تجنب التكرار)
- إذا لا: أنشئ alert جديد
```

**لا يتطلب أي إجراء من المستخدم** - يعمل تلقائياً في الخلفية.

---

## 4. ✅ Cleanup Script للـ Alerts القديمة

### الاستخدام
إذا كان لديك alerts قديمة كثيرة، يمكنك حذفها باستخدام الـ script:

```bash
cd bpb-complete-project/block-preventer-bridge/backend

# تفعيل virtual environment
source venv/bin/activate  # Linux/Mac
# أو: venv\Scripts\activate  # Windows

# حذف alerts أقدم من 7 أيام (افتراضي)
python cleanup_old_alerts.py

# حذف alerts أقدم من 3 أيام
python cleanup_old_alerts.py --days 3

# حذف جميع الـ read alerts أيضاً
python cleanup_old_alerts.py --delete-read

# معاينة فقط (بدون حذف فعلي)
python cleanup_old_alerts.py --dry-run
```

**ماذا يفعل:**
1. يحذف الـ alerts القديمة (أقدم من N أيام)
2. يحذف الـ alerts المتكررة (نفس النوع خلال ساعة واحدة)
3. يمكن حذف الـ read alerts أيضاً
4. يعرض تقرير مفصل بالتغييرات

---

## 📊 ملخص التغييرات التقنية

### Backend
```
✅ app/api/routes/alerts.py
   - أضيف: DELETE /alerts/delete-all endpoint

✅ app/services/alert_service.py
   - أضيف: delete_all_alerts() method

✅ app/services/block_detection_service.py
   - محسّن: _create_critical_alert() مع deduplication
   - محسّن: _create_block_warning() مع deduplication

✅ cleanup_old_alerts.py (جديد)
   - Script لحذف الـ alerts القديمة والمتكررة
```

### Frontend
```
✅ src/lib/api.ts
   - أضيف: alertsApi.delete()
   - أضيف: alertsApi.deleteAll()

✅ src/pages/Alerts.tsx
   - أضيف: Delete All button
   - أضيف: handleDeleteAll() function
   - محسّن: handleDelete() لاستخدام API

✅ src/pages/PackageDetail.tsx
   - أضيف: Edit Settings button
   - أضيف: Edit Settings Dialog
   - أضيف: openEditSettings() function
   - أضيف: handleSaveSettings() function
   - أضيف: settingsForm state
```

---

## 🚀 كيفية التحديث

### إذا كنت تستخدم المشروع بالفعل:

```bash
# 1. سحب آخر التحديثات
cd block-preventer-bridge
git pull origin main

# 2. إعادة تشغيل Backend (إذا كان يعمل)
# أوقف Backend (Ctrl+C)
cd bpb-complete-project/block-preventer-bridge/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# 3. إعادة تشغيل Frontend (إذا كان يعمل)
# أوقف Frontend (Ctrl+C)
cd bpb-complete-project/bpb-frontend/client
npm run dev

# 4. (اختياري) حذف الـ alerts القديمة
cd backend
python cleanup_old_alerts.py --dry-run  # معاينة
python cleanup_old_alerts.py            # حذف فعلي
```

---

## 🎯 الخطوات التالية الموصى بها

### 1. تنظيف الـ Alerts القديمة
```bash
cd backend
python cleanup_old_alerts.py
```

### 2. تعطيل Auto-Pause (إذا لم يتم بعد)
1. اذهب إلى Package Details
2. Limits & Settings → Edit Settings
3. قم بإلغاء تحديد "Auto-Pause on Failures"
4. Save Settings

### 3. اختبار إرسال الرسائل
```bash
curl -X POST "http://localhost:8000/api/v1/packages/<PACKAGE_ID>/messages/open" \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "text",
    "content": "Test message",
    "recipients": ["+201012345678"]
  }'
```

### 4. مراقبة الـ Alerts
- افتح صفحة Alerts
- يجب ألا ترى alerts متكررة بعد الآن
- إذا ظهرت alerts جديدة، ستكون فريدة وواضحة

---

## 📝 ملاحظات مهمة

### Alert Deduplication
- يمنع التكرار **خلال ساعة واحدة** فقط
- بعد ساعة، إذا استمرت المشكلة، سيتم إنشاء alert جديد
- هذا يضمن عدم تفويت المشاكل الحقيقية

### Package Settings
- التعديلات فورية - لا حاجة لإعادة تشغيل
- يمكن التراجع عن أي تغيير بسهولة
- جميع القيم لها validation تلقائي

### Delete All Alerts
- يحذف **جميع** الـ alerts (أو المصفاة حسب الباقة)
- لا يمكن التراجع - تأكد قبل الحذف
- يمكن استخدام cleanup script للحذف الانتقائي

---

## 🐛 Troubleshooting

### المشكلة: لا أرى زر "Delete All"
**الحل:** تأكد من أن هناك alerts موجودة. الزر يظهر فقط عندما `alerts.length > 0`

### المشكلة: لا أرى زر "Edit Settings"
**الحل:** تأكد من أنك في تبويب "Limits & Settings" في Package Details

### المشكلة: لا تزال الـ Alerts تتكرر
**الحل:** 
1. تأكد من أن Backend محدّث (git pull)
2. أعد تشغيل Backend
3. انتظر ساعة واحدة لرؤية التأثير (deduplication يعمل خلال ساعة)

### المشكلة: cleanup script لا يعمل
**الحل:**
```bash
# تأكد من:
1. أن virtual environment مفعّل
2. أن DATABASE_URL موجود في .env
3. أن قاعدة البيانات تعمل

# جرب:
python cleanup_old_alerts.py --dry-run
```

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. راجع ملف `FIX_AUTO_PAUSE_ISSUE.md` للمشاكل الشائعة
2. راجع ملف `PRODUCTION_READY_GUIDE.md` للدليل الشامل
3. تحقق من logs الـ Backend للأخطاء

---

**الإصدار:** 1.0.2  
**التاريخ:** 9 فبراير 2026  
**Commit:** 6caa4e0  
**GitHub:** https://github.com/DevDodge/block-preventer-bridge
