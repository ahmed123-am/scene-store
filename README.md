# SCÈNE

متجر React لمجسمات ثلاثية الأبعاد، مع Node.js API وSupabase للمنتجات والطلبات.

## التشغيل المحلي

من مجلد scene-store استخدم Node.js 24 ثم شغّل الأوامر التالية.

```powershell
npm ci
npm run api
```

في تيرمنال ثانٍ شغّل الواجهة.

```powershell
npm run dev
```

بيانات المنتجات المحلية في backend/products.json، والطلبات المحلية في backend/data/orders.sqlite.

## تجهيز Supabase

طبّق ملف supabase/migrations/202611190001_scene_store.sql من SQL Editor في مشروع Supabase.

انسخ .env.example إلى .env.local وأضف SUPABASE_URL وSUPABASE_SECRET_KEY محليًا. أضف نفس القيم إلى Environment Variables في Vercel.

شغّل الأمر التالي لنقل الكتالوج والطلبات المحلية الموجودة. إعادة تشغيله تتجاوز السجلات الموجودة.

```powershell
npm run sync:supabase
```

تُقرأ بيانات Supabase وتُحفظ الطلبات من خلال وظائف السيرفر. جداول العملاء والطلبات محمية بـRLS وصلاحيات السيرفر.

## النشر على Vercel

اربط ريبو المشروع واختر مجلد scene-store كجذر للمشروع، أو اترك الجذر الافتراضي إذا كان الريبو يحتوي المشروع مباشرة. ملف vercel.json يحدد أمر البناء ومجلد الناتج ووظائف API.

المساران المستخدمان هما GET /api/products وPOST /api/orders.

ملفات المفاتيح وقاعدة البيانات المحلية مستبعدة من Git ومن رفع Vercel.

المجموعة الحالية تحتوي صورًا مولّدة وأسعارًا تجريبية.
