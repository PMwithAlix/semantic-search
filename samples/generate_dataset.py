#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate customer support tickets dataset for Semantic Search demo."""

import csv
import random
from datetime import datetime, timedelta

random.seed(42)

CATEGORIES = [
    "Authentication", "Password Reset", "Payment", "Order", "Refund",
    "Shipping", "Delivery Tracking", "Product", "Search", "Dashboard",
    "Notification", "Mobile App", "Account", "Subscription", "Access",
    "Data Export", "Integration", "Performance", "Security", "Customer Support",
]

# (title, description, product, priority, status, customer_type, resolution, is_hard, semantic_group)
TICKETS = {
    "Authentication": [
        ("بعد از ورود دوباره به صفحه لاگین برمی‌گردم", "سلام. بعد از وارد کردن رمز عبور، کاربر دوباره به صفحه ورود منتقل می‌شود. چند بار امتحان کردم و از مرورگرهای مختلف هم تست کردم.", "Web Platform", "High", "Resolved", "Individual", "کوکی سشن منقضی شده بود؛ تنظیمات احراز هویت اصلاح شد.", True, "auth_loop"),
        ("لاگین می‌کنم ولی وارد نمیشه", "هرچی رمز میزنم وارد حساب نمیشه. اطلاعات درسته ولی مجدد فرم ورود میاد.", "Web Platform", "High", "Closed", "Individual", "مشکل از افزونه مرورگر بود؛ پس از غیرفعال‌سازی ورود انجام شد.", True, "auth_loop"),
        ("اطلاعات ورود درست است اما سیستم اجازه ورود نمی‌دهد", "کاربر Enterprise با ایمیل سازمانی ثبت‌نام کرده. رمز را چند بار تغییر داده‌ام اما هنوز پیام «اطلاعات نامعتبر» نمایش داده می‌شود.", "Customer Portal", "High", "In Progress", "Enterprise", "همگام‌سازی با Active Directory در حال بررسی است.", False, None),
        ("حسابم باز نمیشه و دوباره فرم ورود نمایش داده میشه", "از دیروز نمیتونم وارد پنل بشم. لاگین می‌کنم ولی بلافاصله برمی‌گرده صفحه ورود.", "Dashboard", "High", "Resolved", "Business", "توکن JWT با تنظیمات جدید سازگار نبود؛ رفع شد.", True, "auth_loop"),
        ("ورود با گوگل کار نمی‌کند", "روی دکمه «ورود با Google» کلیک می‌کنم اما بعد از انتخاب حساب، خطای «دسترسی رد شد» می‌گیرم.", "Web Platform", "Medium", "Open", "Individual", "در انتظار بررسی OAuth callback.", False, None),
        ("کد دو مرحله‌ای ارسال نمی‌شود", "وقتی کد OTP درخواست می‌کنم، پیامک یا ایمیلی دریافت نمی‌کنم. شماره و ایمیل را هم چک کردم.", "Mobile App", "High", "In Progress", "Individual", "ارسال SMS از سمت ارائه‌دهنده قطع بود.", False, None),
        ("نشست من بدون دلیل منقضی می‌شود", "هر ۵ دقیقه از حساب خارج می‌شوم حتی وقتی فعال کار می‌کنم. خیلی آزاردهنده است.", "Dashboard", "Medium", "Resolved", "Business", "مدت timeout سشن از ۵ به ۳۰ دقیقه افزایش یافت.", False, None),
        ("خطای 403 بعد از ورود موفق", "با یوزر و پس درست وارد می‌شوم اما صفحه بعدی خطای 403 Forbidden نشان می‌دهد.", "Customer Portal", "Critical", "Resolved", "Enterprise", "نقش کاربر در سیستم RBAC به‌روزرسانی شد.", False, None),
        ("نمیتونم با ایمیل قدیمی وارد بشم", "ایمیلم رو عوض کردم ولی هنوز با ایمیل قبلی باید لاگین کنم؟ سیستم گیج‌کننده‌ست.", "Web Platform", "Medium", "Closed", "Individual", "راهنمای تغییر ایمیل اصلی ارسال شد.", False, None),
        ("ورود از موبایل و وب همزمان مشکل دارد", "روی گوشی وارد می‌شم ولی روی لپ‌تاپ همزمان session قطع می‌شه.", "Mobile App", "Medium", "Open", "Individual", "محدودیت single-session در حال بررسی.", False, None),
    ],
    "Password Reset": [
        ("لینک بازیابی رمز کار نمی‌کند", "ایمیل بازیابی رمز را دریافت کردم اما با کلیک روی لینک پیام «لینک منقضی شده» می‌آید.", "Web Platform", "High", "Resolved", "Individual", "لینک بازیابی مجدداً ارسال شد.", True, "pwd_reset"),
        ("رمز جدید قبول نمی‌شود", "طبق قوانین رمز جدید وارد کردم ولی سیستم می‌گه «رمز ضعیف است» در حالی که همه شرایط را دارد.", "Customer Portal", "Medium", "Closed", "Business", "اعتبارسنجی regex اصلاح شد.", False, None),
        ("ایمیل reset password نمیاد", "سه بار درخواست فراموشی رمز دادم ولی هیچ ایمیلی نیومده. اسپم هم چک کردم.", "Web Platform", "High", "Resolved", "Individual", "ایمیل در لیست bounce بود؛ آدرس اصلاح شد.", True, "pwd_reset"),
        ("بعد از تغییر رمز هنوز با رمز قدیمی وارد می‌شوم", "رمز را عوض کردم و پیام موفقیت دیدم ولی با رمز جدید خطا می‌گیرم.", "Dashboard", "High", "In Progress", "Enterprise", "کش احراز هویت در حال پاک‌سازی.", False, None),
        ("کد بازیابی پیامکی اشتباه است", "کد ۶ رقمی که پیامک شده با چیزی که سایت می‌خواد فرق داره.", "Mobile App", "High", "Resolved", "Individual", "مشکل تأخیر همگام‌سازی OTP برطرف شد.", False, None),
        ("فراموشی رمز برای حساب سازمانی", "کارمند جدید نمی‌تونه رمزش رو ریست کنه چون ایمیل سازمانی فیلتر شده.", "Customer Portal", "Medium", "Open", "Enterprise", "دامنه ایمیل به whitelist اضافه شد.", False, None),
        ("صفحه بازیابی رمز سفید می‌ماند", "روی «فراموشی رمز» کلیک می‌کنم و صفحه خالی لود می‌شه.", "Web Platform", "Medium", "Resolved", "Individual", "خطای JavaScript در فرم بازیابی رفع شد.", False, None),
        ("رمز قبول شد ولی دوباره lock شد", "بعد از ریست رمز، دو بار اشتباه زدم و حساب lock شد. راهی برای unlock نیست؟", "Web Platform", "High", "Closed", "Business", "حساب از طرف پشتیبانی باز شد.", False, None),
        ("لینک reset در موبایل باز نمی‌شود", "لینک بازیابی روی گوشی سامسونگ من Safari error می‌ده.", "Mobile App", "Low", "Resolved", "Individual", "لینک deep link برای موبایل اصلاح شد.", False, None),
        ("سؤال امنیتی جوابش را فراموش کردم", "بدون سؤال امنیتی نمی‌تونم رمز رو بازیابی کنم. راه دیگه‌ای هست؟", "Customer Portal", "Medium", "In Progress", "Individual", "تأیید هویت با مدارک در جریان.", False, None),
    ],
    "Payment": [
        ("مبلغ کسر شد ولی سفارش ثبت نشده", "مبلغ از حساب مشتری کسر شده اما سفارش در سیستم ایجاد نشده است. مبلغ ۲,۴۵۰,۰۰۰ تومان.", "Checkout", "Critical", "In Progress", "Individual", "درگاه پرداخت بررسی و تراکنش در صف بازگشت.", True, "pay_no_order"),
        ("پرداخت موفق بوده ولی سفارش دیده نمی‌شود", "رسید پرداخت دارم و بانک هم تأیید کرده ولی در پنل هیچ سفارشی ثبت نشده.", "Checkout", "Critical", "Resolved", "Business", "Webhook درگاه با تأخیر پردازش شد؛ سفارش دستی ایجاد شد.", True, "pay_no_order"),
        ("درخواست پرداخت خطا داد و پول کسر نشده", "موقع پرداخت خطای timeout داد. لطفاً بررسی کنید پول از حسابم کم نشده باشه.", "Checkout", "High", "Closed", "Individual", "تراکنش ناموفق بود؛ مبلغی کسر نشده.", True, "pay_failed"),
        ("پرداخت دو بار انجام شده", "برای یک سفارش دو بار از کارت من پول کم شده. شماره پیگیری هر دو یکیه.", "Checkout", "Critical", "Resolved", "Individual", "یکی از تراکنش‌های تکراری استرداد شد.", True, "double_charge"),
        ("درگاه پرداخت باز نمی‌شود", "روی پرداخت می‌زنم صفحه درگاه سفید می‌مونه. از Chrome و Firefox تست کردم.", "Checkout", "High", "Open", "Individual", "مشکل SSL درگاه در حال پیگیری.", False, None),
        ("خطای «موجودی کافی نیست» با وجود موجودی", "کارت بانکی موجودی دارد ولی سایت می‌گه موجودی کافی نیست.", "Checkout", "High", "Resolved", "Business", "محدودیت روزانه بانک بود؛ مشتری مطلع شد.", False, None),
        ("پرداخت با کیف پول انجام نمی‌شود", "موجودی کیف پول کافیه ولی دکمه پرداخت غیرفعاله.", "Checkout", "Medium", "In Progress", "Individual", "باگ محاسبه موجودی در حال رفع.", False, None),
        ("فاکتور پرداخت دانلود نمی‌شود", "پرداخت انجام شده ولی PDF فاکتور خطای 500 می‌ده.", "Customer Portal", "Low", "Resolved", "Enterprise", "سرویس تولید PDF ری‌استارت شد.", False, None),
        ("مبلغ نهایی با سبد خرید فرق دارد", "قبل پرداخت ۱.۲ میلیون بود، موقع پرداخت ۱.۴ میلیون شد.", "Checkout", "High", "Closed", "Individual", "مالیات محلی به مبلغ اضافه شده بود؛ توضیح داده شد.", False, None),
        ("پرداخت اقساطی در دسترس نیست", "گزینه پرداخت اقساطی برای سفارش من نمایش داده نمی‌شود.", "Checkout", "Medium", "Open", "Business", "سقف اقساط برای این مبلغ فعال نیست.", False, None),
    ],
    "Order": [
        ("سفارش لغو شده ولی هنوز در حال آماده‌سازی است", "سفارش را لغو کردم و تأیید لغو گرفتم ولی وضعیت هنوز «در حال پردازش» است.", "Customer Portal", "High", "Resolved", "Individual", "وضعیت سفارش با انبار همگام شد.", True, "order_cancel"),
        ("نمی‌توانم سفارش را ویرایش کنم", "آدرس اشتباه وارد کردم. امکان تغییر آدرس قبل ارسال وجود دارد؟", "Web Platform", "Medium", "Closed", "Individual", "آدرس قبل از ارسال اصلاح شد.", False, None),
        ("سفارش تکراری ثبت شده", "یک بار کلیک کردم ولی دو سفارش با شماره‌های مختلف ایجاد شده.", "Checkout", "High", "In Progress", "Business", "یکی از سفارش‌های تکراری لغو شد.", True, "dup_order"),
        ("تاریخ تحویل اشتباه نمایش داده می‌شود", "موقع ثبت سفارش ۳ روزه نوشته بود، الان ۱۰ روزه شده.", "Customer Portal", "Medium", "Open", "Individual", "تأخیر انبار باعث تغییر ETA شده.", False, None),
        ("سفارش در لیست نیست", "پرداخت کردم ولی توی سفارش‌های من چیزی نیست.", "Customer Portal", "Critical", "Resolved", "Individual", "سفارش پس از همگام‌سازی درگاه نمایش داده شد.", True, "pay_no_order"),
        ("امکان افزودن یادداشت به سفارش نیست", "می‌خوام به پیک بگم زنگ نزنه ولی فیلد یادداشت وجود نداره.", "Web Platform", "Low", "Resolved", "Individual", "یادداشت در سیستم انبار ثبت شد.", False, None),
        ("سفارش عمده نیاز به تأیید دارد", "سفارش B2B ما ۴۸ ساعته در وضعیت «در انتظار تأیید» مانده.", "Customer Portal", "High", "In Progress", "Enterprise", "تأیید مدیر فروش در انتظار.", False, None),
        ("کد تخفیف روی سفارش اعمال نشده", "کد WINTER20 را زدم ولی در فاکتور نهایی تخفیف نیست.", "Checkout", "Medium", "Closed", "Individual", "کد منقضی شده بود؛ کد جایگزین ارسال شد.", False, None),
        ("سفارش به حساب دیگری رفته", "با اکانت A سفارش دادم ولی در اکانت B نمایش داده می‌شود.", "Web Platform", "High", "Resolved", "Business", "سفارش به حساب صحیح منتقل شد.", False, None),
        ("حداقل مبلغ سفارش مانع checkout است", "سبد ۴۹۰ هزار تومان است ولی حداقل ۵۰۰ هزار می‌خواد. یک محصول کوچک اضافه نمی‌شه.", "Checkout", "Low", "Open", "Individual", "محدودیت حداقل سفارش در حال بررسی.", False, None),
    ],
    "Refund": [
        ("درخواست استرداد دادم ولی پول برنگشته", "مشتری درخواست استرداد وجه داده اما هنوز مبلغ به حساب او بازنگشته است. ۱۸ روز گذشته.", "Customer Portal", "Critical", "In Progress", "Individual", "استرداد در صف بانکی؛ ۳-۵ روز کاری.", True, "refund_pending"),
        ("مبلغ استرداد کمتر از پرداختی است", "کل مبلغ سفارش ۳ میلیون بود، فقط ۲.۵ میلیون برگشت.", "Customer Portal", "High", "Open", "Business", "کسر هزینه ارسال طبق سیاست بازگشت.", False, None),
        ("استرداد به کارت قدیمی انجام شده", "کارتم عوض شده ولی پول به کارت قبلی رفته.", "Customer Portal", "High", "Resolved", "Individual", "استرداد به کارت جدید از طریق بانک پیگیری شد.", True, "refund_card"),
        ("دکمه درخواست بازگشت وجه کار نمی‌کند", "روی «درخواست استرداد» کلیک می‌کنم هیچ اتفاقی نمی‌افته.", "Web Platform", "Medium", "Closed", "Individual", "درخواست دستی از طرف پشتیبانی ثبت شد.", False, None),
        ("وضعیت استرداد «رد شده» بدون دلیل", "درخواست بازگشت وجه رد شده ولی دلیلی ذکر نشده.", "Customer Portal", "High", "In Progress", "Enterprise", "بررسی مدارک بازگشت کالا.", False, None),
        ("پول سفارش لغوشده هنوز نیومده", "هفته پیش لغو کردم، نوشته استرداد شده ولی تو حسابم نیست.", "Customer Portal", "Critical", "Resolved", "Individual", "تأخیر بانکی؛ مبلغ ۲ روز بعد واریز شد.", True, "refund_pending"),
        ("استرداد جزئی درخواست کردم", "فقط یکی از ۳ محصول را برگشت می‌زنم. امکانش هست؟", "Customer Portal", "Medium", "Closed", "Business", "استرداد جزئی پشتیبانی می‌شود؛ راهنما ارسال شد.", False, None),
        ("رسید استرداد دریافت نکردم", "می‌گن پول برگشته ولی ایمیل یا SMS تأیید ندارم.", "Customer Portal", "Low", "Resolved", "Individual", "رسید استرداد مجدداً ارسال شد.", False, None),
        ("استرداد به کیف پول انجام نشده", "گزینه استرداد به wallet را زدم ولی موجودی اضافه نشده.", "Customer Portal", "High", "Open", "Individual", "تراکنش wallet در حال بررسی.", False, None),
        ("زمان استرداد خیلی طولانی است", "نوشته ۷-۱۴ روز کاری. نمی‌شه سریع‌تر؟", "Customer Portal", "Medium", "Closed", "Enterprise", "زمان استرداد وابسته به چرخه بانکی است.", False, None),
    ],
    "Shipping": [
        ("آدرس ارسال اشتباه ثبت شده", "پیک به آدرس قبلی رفته. آدرس جدید را قبل ارسال فرستاده بودم.", "Customer Portal", "High", "Resolved", "Individual", "ارسال مجدد به آدرس صحیح.", False, None),
        ("هزینه ارسال غیرمنتظره اضافه شد", "موقع checkout رایگان بود، فاکتور نهایی ۴۵ هزار هزینه ارسال دارد.", "Checkout", "Medium", "Closed", "Individual", "منطقه دور از شهر under zone جدید.", False, None),
        ("ارسال express در دسترس نیست", "برای شهر ما فقط ارسال عادی نمایش داده می‌شود.", "Web Platform", "Low", "Open", "Business", "ارسال express به این شهر به زودی.", False, None),
        ("مرسوله آسیب دیده رسیده", "بسته باز شده و محصول خراب است. عکس هم پیوست کردم.", "Customer Portal", "High", "In Progress", "Individual", "درخواست تعویض در حال پردازش.", False, None),
        ("ارسال به صندوق پستی ممکن نیست", "فقط آدرس منزل قبول می‌کنه، صندوق پستی نمی‌ذاره.", "Checkout", "Low", "Resolved", "Individual", "محدودیت از طرف پست.", False, None),
        ("زمان‌بندی تحویل انتخاب نمی‌شود", "می‌خوام شنبه تحویل بگیرم ولی تقویم خالیه.", "Web Platform", "Medium", "Closed", "Individual", "ظرفیت تحویل شنبه تکمیل شده.", False, None),
        ("چند بسته برای یک سفارش", "یک سفارش ۵ بسته جداگانه شده. پیگیری سخت شده.", "Customer Portal", "Medium", "Open", "Enterprise", "تجمیع ارسال برای سفارش‌های بعدی.", False, None),
        ("پیک بدون هماهنگی آمده", "کسی خونه نبود و بسته برگشت خورد.", "Customer Portal", "High", "Resolved", "Individual", "هماهنگی مجدد ارسال.", False, None),
        ("محدودیت ارسال برای کالای حجیم", "یخچال سفارش دادم ولی می‌گه به شهر ما ارسال نمی‌شه.", "Checkout", "Medium", "In Progress", "Business", "هماهنگی با حمل‌ونقل سنگین.", False, None),
        ("برچسب ارسال در پنل نمایش داده نمی‌شود", "برای مرجوعی نیاز به برچسب دارم ولی دانلود نمی‌شه.", "Customer Portal", "Low", "Resolved", "Individual", "برچسب از طریق ایمیل ارسال شد.", False, None),
    ],
    "Delivery Tracking": [
        ("کد رهگیری چیزی نشون نمیده", "شماره پیگیری ایجاد شده اما اطلاعات مرسوله چند روز است به‌روزرسانی نشده.", "Customer Portal", "Medium", "In Progress", "Individual", "مشکل از سرویس رهگیری شرکت حمل‌ونقل بود.", True, "tracking_stale"),
        ("بسته ارسال شده ولی وضعیت «در انبار» است", "۳ روز پیش ارسال شده ولی هنوز در پنل نوشته در انبار.", "Customer Portal", "High", "Resolved", "Business", "وضعیت با API پست همگام شد.", True, "tracking_stale"),
        ("لینک رهگیری خطا می‌دهد", "روی لینک پیگیری کلیک می‌کنم صفحه 404 می‌آید.", "Web Platform", "Medium", "Closed", "Individual", "URL رهگیری اصلاح شد.", False, None),
        ("موقعیت GPS پیک نمایش داده نمی‌شود", "گزینه live tracking کار نمی‌کنه.", "Mobile App", "Low", "Open", "Individual", "فقط برای ارسال same-day فعال است.", False, None),
        ("تاریخ تحویل واقعی با اعلام‌شده فرق دارد", "گفته بود فردا می‌رسه، یک هفته گذشته.", "Customer Portal", "High", "In Progress", "Individual", "تأخیر انبار و پست.", False, None),
        ("SMS تحویل نیامده", "بسته رسیده ولی پیامکی دریافت نکردم.", "Mobile App", "Low", "Resolved", "Individual", "SMS از سمت اپراتور تأخیر داشت.", False, None),
        ("کد رهگیری اشتباه در ایمیل", "کد توی ایمیل با کد سایت فرق داره.", "Customer Portal", "Medium", "Resolved", "Business", "ایمیل اصلاحی ارسال شد.", False, None),
        ("مرسوله delivered نشون میده ولی نرسیده", "نوشته تحویل داده شده ولی من چیزی دریافت نکردم.", "Customer Portal", "Critical", "Open", "Individual", "تحقیق با پست در جریان.", True, "false_delivered"),
        ("چند کد رهگیری برای یک سفارش", "کدوم رو باید پیگیری کنم؟ سه تا کد مختلف دارم.", "Customer Portal", "Medium", "Closed", "Enterprise", "هر کد مربوط به یک بسته.", False, None),
        ("نقشه مسیر پیک خالی است", "صفحه tracking فقط loading می‌زنه.", "Mobile App", "Low", "Resolved", "Individual", "مشکل CDN نقشه برطرف شد.", False, None),
    ],
    "Product": [
        ("محصول با تصویر سایت فرق دارد", "رنگ دریافتی با عکس محصول یکی نیست.", "Web Platform", "Medium", "In Progress", "Individual", "تعویض یا استرداد در حال بررسی.", False, None),
        ("موجودی نمایش داده می‌شود ولی ناموجود است", "موجود بود ولی موقع پرداخت گفت تموم شده.", "Web Platform", "High", "Resolved", "Individual", "موجودی real-time sync اصلاح شد.", True, "stock_mismatch"),
        ("مشخصات فنی محصول ناقص است", "ولتاژ و ابعاد در صفحه محصول نیست.", "Web Platform", "Low", "Closed", "Business", "اطلاعات از تأمین‌کننده دریافت شد.", False, None),
        ("نظرات محصول نمایش داده نمی‌شوند", "۵ نظر گذاشتم ولی هیچکدوم approve نشده.", "Web Platform", "Low", "Open", "Individual", "نظرات در صف moderation.", False, None),
        ("گارانتی محصول در فاکتور نیست", "گارانتی ۱۸ ماهه بود ولی توی فاکتور ذکر نشده.", "Customer Portal", "Medium", "Resolved", "Individual", "گواهی گارانتی جداگانه ارسال شد.", False, None),
        ("محصول مشابه پیشنهاد نمی‌شود", "بخش «محصولات مرتبط» خالی است.", "Web Platform", "Low", "Closed", "Individual", "الگوریتم پیشنهاد به‌روز شد.", False, None),
        ("SKU اشتباه ارسال شده", "کد محصول فرق داره با چیزی که سفارش دادم.", "Customer Portal", "High", "In Progress", "Enterprise", "تعویض SKU در انبار.", False, None),
        ("قیمت محصول بعد خرید کم شد", "دیروز خریدم، امروز ۲۰٪ ارزون‌تره.", "Customer Portal", "Medium", "Closed", "Individual", "سیاست price match اعمال شد.", False, None),
        ("دفترچه راهنما فارسی ندارد", "فقط انگلیسی داخل جعبه بود.", "Web Platform", "Low", "Resolved", "Individual", "PDF فارسی از سایت دانلود.", False, None),
        ("محصول expire date نزدیک دارد", "تاریخ انقضا ۲ هفته دیگه است.", "Customer Portal", "High", "Open", "Business", "تعویض با batch جدید.", False, None),
    ],
    "Search": [
        ("جستجو نتیجه مرتبط نمی‌دهد", "کلمه «لپ‌تاپ» را می‌زنم محصولات نامرتبط می‌آید.", "Web Platform", "Medium", "In Progress", "Individual", "ایندکس جستجو در حال بازسازی.", True, "search_bad"),
        ("فیلتر قیمت کار نمی‌کند", "بازه ۱ تا ۵ میلیون را زدم ولی همه قیمت‌ها می‌آید.", "Web Platform", "Medium", "Resolved", "Individual", "باگ فیلتر Elasticsearch رفع شد.", False, None),
        ("جستجوی فارسی نتیجه نمی‌دهد", "با حروف فارسی چیزی پیدا نمی‌کنه، انگلیسی ok است.", "Web Platform", "Medium", "Open", "Business", "normalization فارسی در حال بهبود.", True, "search_fa"),
        ("پیشنهاد خودکار (autocomplete) کند است", "هر حرف ۳ ثانیه طول می‌کشه.", "Web Platform", "Low", "Closed", "Individual", "کش autocomplete فعال شد.", False, None),
        ("جستجو در موبایل با دسکتاپ فرق دارد", "همون کلمه نتایج متفاوت.", "Mobile App", "Medium", "In Progress", "Individual", "یکسان‌سازی ایندکس موبایل/وب.", False, None),
        ("جستجوی صوتی کار نمی‌کند", "مایک روشن می‌شه ولی متن تشخیص داده نمی‌شه.", "Mobile App", "Low", "Open", "Individual", "پشتیبانی فارسی speech-to-text محدود.", False, None),
        ("نتیجه جستجو صفحه سفید", "بعد از enter صفحه خالی می‌شه.", "Web Platform", "High", "Resolved", "Individual", "خطای API جستجو رفع شد.", False, None),
        ("جستجوی برند خاص نتیجه ندارد", "برند XYZ در سایت هست ولی search چیزی نمیاره.", "Web Platform", "Medium", "Closed", "Enterprise", "نام برند به synonym map اضافه شد.", False, None),
        ("مرتب‌سازی بر اساس قیمت اشتباه است", "ارزان‌ترین اول نیست.", "Web Platform", "Low", "Resolved", "Individual", "sort field اصلاح شد.", False, None),
        ("جستجوی پیشرفته در دسترس نیست", "گزینه advanced search حذف شده؟", "Web Platform", "Low", "Open", "Business", "در نسخه جدید UI جابجا شده.", False, None),
    ],
    "Dashboard": [
        ("داشبورد آمار اشتباه نشان می‌دهد", "فروش امروز صفر نشون میده در حالی که سفارش داریم.", "Dashboard", "High", "In Progress", "Business", "تأخیر ETL داده فروش.", True, "dash_wrong"),
        ("نمودارها لود نمی‌شوند", "صفحه dashboard فقط spinner می‌زنه.", "Dashboard", "Medium", "Resolved", "Enterprise", "سرویس charting ری‌استارت شد.", False, None),
        ("گزارش PDF خروجی ناقص است", "نیمی از جدول در PDF بریده شده.", "Dashboard", "Medium", "Closed", "Business", "تنظیمات page break اصلاح شد.", False, None),
        ("فیلتر تاریخ کار نمی‌کند", "بازه ماه گذشته را انتخاب می‌کنم داده امروز می‌آید.", "Dashboard", "Medium", "Open", "Enterprise", "timezone dashboard در حال اصلاح.", False, None),
        ("ویجت سفارشی ذخیره نمی‌شود", "layout را عوض می‌کنم بعد refresh برمی‌گرده.", "Dashboard", "Low", "Resolved", "Business", "localStorage conflict رفع شد.", False, None),
        ("دسترسی به داشبورد فروش ندارم", "مدیر گفته دسترسی دارم ولی 403 می‌گیرم.", "Dashboard", "High", "In Progress", "Enterprise", "نقش analytics به کاربر اضافه شد.", False, None),
        ("داده real-time به‌روز نمی‌شود", "آخرین بروزرسانی ۶ ساعت پیش نوشته.", "Dashboard", "Medium", "Closed", "Business", "WebSocket reconnect fix.", False, None),
        ("Export Excel خطا می‌دهد", "دانلود CSV timeout می‌شه.", "Dashboard", "Medium", "Resolved", "Enterprise", "limit export افزایش یافت.", False, None),
        ("مقایسه دوره‌ها درست نیست", "ماه به ماه اعداد منطقی نیست.", "Dashboard", "Medium", "Open", "Business", "باگ محاسبه YoY.", False, None),
        ("داشبورد موبایل شلوغ است", "روی گوشی قابل استفاده نیست.", "Mobile App", "Low", "In Progress", "Individual", "responsive layout در roadmap.", False, None),
    ],
    "Notification": [
        ("ایمیل اطلاع‌رسانی نمی‌آید", "تیک «دریافت ایمیل» فعاله ولی هیچ ایمیلی نمی‌گیرم.", "Customer Portal", "Medium", "Resolved", "Individual", "ایمیل در suppression list بود.", True, "notif_email"),
        ("پیامک سفارش دیر می‌رسد", "SMS بعد از تحویل بسته رسید.", "Mobile App", "Medium", "Closed", "Individual", "تأخیر queue SMS.", False, None),
        ("نوتیفیکیشن push تکراری", "برای یک رویداد ۵ بار notification می‌آد.", "Mobile App", "Low", "Resolved", "Individual", "deduplication rule اضافه شد.", False, None),
        ("اعلان‌ها خاموش نمی‌شوند", "همه را off کردم ولی still می‌آد.", "Mobile App", "Medium", "In Progress", "Individual", "تنظیمات sync موبایل/سرور.", False, None),
        ("ایمیل به زبان اشتباه", "زبان فارسی انتخاب کردم ولی ایمیل انگلیسی می‌آید.", "Customer Portal", "Low", "Closed", "Business", "locale preference اصلاح شد.", False, None),
        ("webhook notification fail", "Endpoint ما 500 می‌گیره.", "Customer Portal", "High", "Open", "Enterprise", "retry policy webhook بررسی.", False, None),
        ("خلاصه هفتگی ارسال نمی‌شود", "۲ هفته است weekly digest نیامده.", "Customer Portal", "Low", "Resolved", "Individual", "job scheduler fix.", False, None),
        ("اعلان سفارش برای کاربر اشتباه", "سفارش همکارم برای من notification آمده.", "Customer Portal", "High", "In Progress", "Enterprise", "bug routing notification.", False, None),
        ("صدای notification کار نمی‌کند", "توی تنظیمات گوشی ok ولی silent می‌آد.", "Mobile App", "Low", "Closed", "Individual", "channel importance Android fix.", False, None),
        ("لینک داخل ایمیل منقضی است", "روی «مشاهده سفارش» کلیک می‌کنم expired.", "Customer Portal", "Medium", "Resolved", "Individual", "TTL لینک magic افزایش یافت.", False, None),
    ],
    "Mobile App": [
        ("اپ کرش می‌کند موقع باز کردن", "بعد از آپدیت آخر، اپ اصلاً باز نمی‌شه.", "Mobile App", "Critical", "Resolved", "Individual", "hotfix نسخه ۳.۲.۱ منتشر شد.", False, None),
        ("ورود اثرانگشت کار نمی‌کند", "Face ID ok ولی fingerprint error می‌ده.", "Mobile App", "Medium", "Open", "Individual", "مشکل Samsung Knox.", False, None),
        ("سبد خرید sync نمی‌شود", "روی وب اضافه کردم، توی اپ نیست.", "Mobile App", "High", "In Progress", "Individual", "cart sync service.", True, "cart_sync"),
        ("اپ خیلی کند است", "هر صفحه ۱۰ ثانیه لود می‌شه.", "Mobile App", "High", "Resolved", "Business", "بهینه‌سازی image cache.", False, None),
        ("دانلود فاکتور در اپ ممکن نیست", "دکمه download کار نمی‌کنه.", "Mobile App", "Medium", "Closed", "Individual", "permission storage fix.", False, None),
        ("نسخه iOS قدیمی پشتیبانی نمی‌شود", "iPhone 8 اپ را update نمی‌تونه.", "Mobile App", "Low", "Open", "Individual", "حداقل iOS 15.", False, None),
        ("اعلان deep link کار نمی‌کند", "روی notification کلیک می‌کنم صفحه اشتباه باز می‌شه.", "Mobile App", "Medium", "In Progress", "Individual", "routing deep link fix.", False, None),
        ("کیبورد روی input می‌ماند", "بعد از جستجو keyboard بسته نمی‌شه.", "Mobile App", "Low", "Resolved", "Individual", "UI bug fix.", False, None),
        ("حالت offline کار نمی‌کند", "بدون اینternet باید سفارش‌های قبلی را ببینم.", "Mobile App", "Medium", "Open", "Business", "offline cache در development.", False, None),
        ("آپدیت از استور نصب نمی‌شود", "Google Play error 963.", "Mobile App", "High", "Closed", "Individual", "پاک کردن cache store.", False, None),
    ],
    "Account": [
        ("نمی‌توانم پروفایل را ویرایش کنم", "دکمه save کار نمی‌کنه.", "Customer Portal", "Medium", "Resolved", "Individual", "validation field mobile fix.", False, None),
        ("حذف حساب کاربری ممکن نیست", "گزینه delete account وجود نداره.", "Customer Portal", "Medium", "In Progress", "Individual", "GDPR delete flow.", False, None),
        ("دو حساب با یک ایمیل", "سیستم گفته ایمیل تکراری ولی من فقط یک حساب می‌شناسم.", "Customer Portal", "High", "Resolved", "Individual", "حساب duplicate merge.", False, None),
        ("تغییر شماره موبایل verify نمی‌شود", "کد OTP برای شماره جدید نمی‌آد.", "Customer Portal", "High", "Open", "Individual", "SMS provider issue.", False, None),
        ("آواتار آپلود نمی‌شود", "عکس بیش از ۲MB error می‌ده با اینکه ۵۰۰KB است.", "Customer Portal", "Low", "Closed", "Individual", "compression server-side.", False, None),
        ("تاریخ تولد ذخیره نمی‌شود", "هر بار خالی برمی‌گرده.", "Customer Portal", "Low", "Resolved", "Individual", "date format locale bug.", False, None),
        ("حساب Business به Individual تبدیل شد", "بدون درخواست من نوع حساب عوض شده.", "Customer Portal", "High", "In Progress", "Business", "migration script rollback.", False, None),
        ("لینک دعوت دوستان کار نمی‌کند", "referral code invalid.", "Customer Portal", "Medium", "Closed", "Individual", "کد جدید generate.", False, None),
        ("تنظیمات حریم خصوصی reset شده", "همه preferences برگشته default.", "Customer Portal", "Medium", "Open", "Individual", "database migration side effect.", False, None),
        ("امکان اتصال حساب بانکی نیست", "IBAN verify fail.", "Customer Portal", "High", "Resolved", "Business", "فرمت شبا اصلاح.", False, None),
    ],
    "Subscription": [
        ("اشتراک renew نشده", "تاریخ تمدید گذشته ولی هنوز active نشون میده.", "Customer Portal", "High", "In Progress", "Business", "payment method expired.", True, "sub_renew"),
        ("لغو اشتراک اعمال نشده", "cancel زدم ولی هنوز charge می‌شه.", "Customer Portal", "Critical", "Open", "Individual", "subscription cancel queue.", True, "sub_cancel"),
        ("ارتقا plan انجام نشده", "پول premium کسر شده plan عوض نشده.", "Customer Portal", "High", "Resolved", "Enterprise", "webhook billing fix.", True, "sub_upgrade"),
        ("فاکتور اشتراک ماهانه نادرست", "مبلغ با plan selected فرق داره.", "Customer Portal", "Medium", "Closed", "Business", "proration explain.", False, None),
        ("trial زودتر تمام شده", "۷ روز trial بود، ۳ روزه قطع شد.", "Customer Portal", "High", "In Progress", "Individual", "trial clock bug.", False, None),
        ("coupon اشتراک کار نمی‌کند", "کد ۵۰٪ invalid.", "Customer Portal", "Medium", "Resolved", "Individual", "کد one-time already used.", False, None),
        ("دسترسی premium بعد downgrade", "plan را پایین آوردم ولی features premium فعاله.", "Customer Portal", "Medium", "Open", "Business", "grace period 24h.", False, None),
        ("invoice subscription download fail", "PDF billing error.", "Customer Portal", "Low", "Closed", "Enterprise", "invoice service fix.", False, None),
        ("تعداد seat اشتباه charge شده", "۵ user داریم ۱۰ seat bill.", "Customer Portal", "High", "In Progress", "Enterprise", "seat count audit.", False, None),
        ("pause subscription option نیست", "می‌خوام ۲ ماه pause کنم.", "Customer Portal", "Low", "Open", "Individual", "feature request logged.", False, None),
    ],
    "Access": [
        ("دسترسی به بخش گزارشات ندارم", "همکارم می‌بینه من نه.", "Dashboard", "High", "Resolved", "Enterprise", "permission report-view add.", False, None),
        ("invite team member کار نمی‌کند", "ایمیل دعوت ارسال نمی‌شه.", "Customer Portal", "Medium", "In Progress", "Business", "SMTP rate limit.", False, None),
        ("نقش admin اشتباه assign شده", "باید viewer باشم admin شدم.", "Customer Portal", "Critical", "Resolved", "Enterprise", "role corrected.", False, None),
        ("IP whitelist دسترسی را block کرد", "از دفتر وارد نمی‌شیم.", "Web Platform", "Critical", "Open", "Enterprise", "IP range update.", False, None),
        ("SSO login redirect loop", "SAML assertion fail.", "Web Platform", "Critical", "In Progress", "Enterprise", "IdP metadata sync.", True, "sso_loop"),
        ("API key revoked بدون اطلاع", "یک‌شبه key کار نمی‌کنه.", "Customer Portal", "High", "Closed", "Enterprise", "key rotation notice.", False, None),
        ("محدودیت تعداد session", "تیم ۱۰ نفره نمی‌تونه همزمان login.", "Web Platform", "Medium", "Open", "Business", "concurrent seat limit.", False, None),
        ("دسترسی guest expire نشده", "مهمان باید قطع شده باشه.", "Customer Portal", "Medium", "Resolved", "Enterprise", "guest TTL job fix.", False, None),
        ("فایل share link عمومی شده", "لینک private بود public شده.", "Customer Portal", "Critical", "In Progress", "Enterprise", "ACL audit.", False, None),
        ("دسترسی ماژول billing", "tab billing grey out.", "Customer Portal", "Medium", "Closed", "Business", "billing role assign.", False, None),
    ],
    "Data Export": [
        ("export داده CSV خالی است", "فایل دانلود می‌شه ولی فقط header داره.", "Dashboard", "High", "Resolved", "Enterprise", "export query filter fix.", True, "export_empty"),
        ("درخواست export گیر کرده", "۳ ساعته pending.", "Customer Portal", "Medium", "In Progress", "Business", "export queue stuck.", False, None),
        ("فرمت export JSON ناقص", "نیمی از records missing.", "Dashboard", "High", "Open", "Enterprise", "pagination export bug.", False, None),
        ("GDPR data export", "می‌خوام همه داده‌هام رو بگیرم.", "Customer Portal", "Medium", "Closed", "Individual", "package within 30 days.", False, None),
        ("export بزرگ timeout", "۱۰۰هزار رکورد export fail.", "Dashboard", "High", "Resolved", "Enterprise", "async export job.", False, None),
        ("ستون تاریخ اشتباه format", "dates in export wrong timezone.", "Dashboard", "Medium", "Closed", "Business", "UTC label add.", False, None),
        ("export history delete", "لیست exportهای قبلی پاک شده.", "Customer Portal", "Low", "Open", "Individual", "retention policy.", False, None),
        ("Excel export encoding فارسی", "حروف فارسی broken در Excel.", "Dashboard", "Medium", "Resolved", "Business", "UTF-8 BOM add.", True, "export_encoding"),
        ("scheduled export اجرا نشده", "هر شب باید email بیاد.", "Dashboard", "Medium", "In Progress", "Enterprise", "cron job fail.", False, None),
        ("export filter save نمی‌شود", "saved filter gone after logout.", "Dashboard", "Low", "Closed", "Business", "persist filter DB.", False, None),
    ],
    "Integration": [
        ("اتصال Shopify قطع شده", "sync سفارش‌ها stop شده.", "Customer Portal", "Critical", "In Progress", "Enterprise", "OAuth token refresh.", True, "int_shopify"),
        ("webhook به CRM نمی‌رسد", "Lead create نمی‌شه.", "Customer Portal", "High", "Open", "Business", "webhook URL SSL.", False, None),
        ("API rate limit خیلی پایین", "integration ما throttle می‌شه.", "Customer Portal", "High", "In Progress", "Enterprise", "rate limit increase request.", False, None),
        ("Zapier zap fail", "step 3 error always.", "Customer Portal", "Medium", "Resolved", "Business", "field mapping update.", False, None),
        ("Accounting export duplicate", "فاکتورها دوبار sync.", "Dashboard", "High", "Closed", "Enterprise", "idempotency key.", False, None),
        ("Slack notification format broken", "markdown render wrong.", "Customer Portal", "Low", "Resolved", "Business", "slack block kit update.", False, None),
        ("ERP stock mismatch", "موجودی ERP با shop فرق.", "Customer Portal", "Critical", "Open", "Enterprise", "inventory sync lag.", True, "erp_stock"),
        ("Google Analytics tracking gap", "conversion not recorded.", "Web Platform", "Medium", "In Progress", "Business", "GA4 event config.", False, None),
        ("Payment gateway sandbox in prod", "test mode transactions.", "Checkout", "Critical", "Resolved", "Enterprise", "env variable fix.", False, None),
        ("Custom API docs outdated", "endpoint 404 in docs.", "Customer Portal", "Low", "Closed", "Enterprise", "docs regenerate.", False, None),
    ],
    "Performance": [
        ("سایت خیلی کند لود می‌شود", "homepage ۱۵ ثانیه.", "Web Platform", "High", "In Progress", "Individual", "CDN cache miss.", True, "perf_slow"),
        ("timeout موقع checkout", "payment page hang.", "Checkout", "Critical", "Resolved", "Individual", "DB connection pool.", False, None),
        ("API response 30s", "dashboard API slow.", "Dashboard", "High", "Open", "Enterprise", "query optimization.", False, None),
        ("memory leak in mobile app", "after 1 hour app sluggish.", "Mobile App", "High", "In Progress", "Individual", "profiler investigation.", False, None),
        ("search timeout", "complex query 504.", "Web Platform", "Medium", "Closed", "Business", "search timeout increase.", False, None),
        ("image load lazy broken", "above fold images delay.", "Web Platform", "Medium", "Resolved", "Individual", "lazy load threshold.", False, None),
        ("peak traffic 503", "Black Friday errors.", "Web Platform", "Critical", "Closed", "Enterprise", "auto-scale add capacity.", False, None),
        ("report generation 10 min", "monthly report too slow.", "Dashboard", "Medium", "Open", "Enterprise", "materialized view.", False, None),
        ("websocket disconnect frequent", "live updates drop.", "Dashboard", "Medium", "In Progress", "Business", "heartbeat interval.", False, None),
        ("database lock timeout", "concurrent order fail.", "Checkout", "High", "Resolved", "Enterprise", "transaction isolation.", False, None),
    ],
    "Security": [
        ("فعالیت مشکوک در حساب", "login از کشور دیگر.", "Customer Portal", "Critical", "Resolved", "Individual", "password reset force + 2FA.", False, None),
        ("ایمیل فیشینگ با برند شما", "ایمیل جعلی refund.", "Customer Portal", "High", "Closed", "Individual", "official domain educate.", False, None),
        ("رمز در breach list", "Have I Been Pwned alert.", "Web Platform", "Critical", "In Progress", "Individual", "mandatory password change.", False, None),
        ("session hijack suspected", "settings changed not by me.", "Customer Portal", "Critical", "Open", "Individual", "invalidate all sessions.", False, None),
        ("API key exposed in GitHub", "public repo leak.", "Customer Portal", "Critical", "Resolved", "Enterprise", "key rotate + revoke.", False, None),
        ("CAPTCHA bypass attempts", "bot login surge.", "Web Platform", "High", "In Progress", "Business", "WAF rule tighten.", False, None),
        ("SSL certificate expiring", "browser warning.", "Web Platform", "Critical", "Resolved", "Enterprise", "cert auto-renew fix.", False, None),
        ("permission escalation bug report", "viewer saw admin panel briefly.", "Dashboard", "Critical", "Open", "Enterprise", "security patch deploy.", False, None),
        ("malware in uploaded file", "virus scan alert.", "Customer Portal", "High", "Closed", "Business", "upload quarantine.", False, None),
        ("audit log missing entries", "compliance gap.", "Dashboard", "High", "In Progress", "Enterprise", "audit pipeline fix.", False, None),
    ],
    "Customer Support": [
        ("پاسخ تیکت خیلی دیر رسید", "۵ روز بدون پاسخ.", "Customer Portal", "Medium", "Closed", "Individual", "SLA breach apology + priority.", False, None),
        ("چت آنلاین همیشه offline", "never available.", "Web Platform", "Medium", "Open", "Individual", "staffing hours expand.", False, None),
        ("تیکت duplicate شد", "same issue two tickets.", "Customer Portal", "Low", "Resolved", "Individual", "tickets merged.", False, None),
        ("پاسخ boilerplate irrelevant", "copy paste answer.", "Customer Portal", "Medium", "In Progress", "Business", "agent retraining.", False, None),
        ("تماس تلفنی برنگشت", "callback requested.", "Customer Portal", "High", "Closed", "Individual", "callback completed.", False, None),
        ("رضایت‌سنجی کار نمی‌کند", "survey link broken.", "Customer Portal", "Low", "Resolved", "Individual", "survey URL fix.", False, None),
        ("پشتیبانی فارسی ضعیف", "agent English only.", "Customer Portal", "Medium", "Open", "Individual", "Farsi team assign.", False, None),
        ("escalation to manager", "issue unresolved 2 weeks.", "Customer Portal", "High", "In Progress", "Enterprise", "manager review.", False, None),
        ("KB article outdated", "help doc wrong steps.", "Web Platform", "Low", "Closed", "Individual", "article update.", False, None),
        ("support portal login separate", "another password needed.", "Customer Portal", "Medium", "Resolved", "Business", "SSO for support portal.", False, None),
    ],
}

TEST_QUERIES = [
    ("Q001", "پول از حسابم کم شده ولی سفارش ثبت نشده", "T-021", "Payment", "charged but order was not created", True),
    ("Q002", "هر بار لاگین می‌کنم دوباره منو می‌فرسته صفحه ورود", "T-001", "Authentication", "login redirect loop", True),
    ("Q003", "بسته ارسال شده ولی کد رهگیری هیچ چیزی نشون نمی‌ده", "T-061", "Delivery Tracking", "tracking info not updating", True),
    ("Q004", "پول سفارشی که لغو کردم هنوز بهم برنگشته", "T-041", "Refund", "refund not received after cancellation", True),
    ("Q005", "پول رو دادم ولی خریدم تو حسابم نیست", "T-022", "Payment", "paid but order missing in account", True),
    ("Q006", "ایمیل بازیابی رمز نمیاد", "T-013", "Password Reset", "password reset email not received", True),
    ("Q007", "رسید بانک دارم ولی سفارش تو پنل نیست", "T-035", "Order", "payment confirmed but no order in panel", True),
    ("Q008", "دو بار از کارت پول کم شده", "T-024", "Payment", "duplicate charge same order", True),
    ("Q009", "مرسوله delivered زده ولی تحویل نگرفتم", "T-068", "Delivery Tracking", "marked delivered but not received", True),
    ("Q010", "جستجو لپ‌تاپ میزنم چیزای بی‌ربط میاد", "T-081", "Search", "irrelevant search results", True),
    ("Q011", "داشبورد فروش امروز صفر نشون میده", "T-091", "Dashboard", "dashboard shows wrong sales data", False),
    ("Q012", "سبد خرید وب و موبایل یکی نیست", "T-113", "Mobile App", "cart not synced between web and app", True),
    ("Q013", "export اکسل حروف فارسی خرابه", "T-158", "Data Export", "Persian encoding broken in Excel export", True),
    ("Q014", "اشتراک cancel کردم هنوز پول میگیره", "T-132", "Subscription", "cancelled subscription still charging", True),
    ("Q015", "موجودی هست ولی میگه تموم شده", "T-072", "Product", "shows in stock but unavailable at checkout", True),
    ("Q016", "اتصال فروشگاه آنلاین قطع شده", "T-161", "Integration", "e-commerce integration disconnected", True),
    ("Q017", "سایت خیلی کنده باز نمیشه", "T-171", "Performance", "site loads very slowly", True),
    ("Q018", "نوتیف ایمیل سفارش نمیره", "T-101", "Notification", "order email notifications not arriving", False),
    ("Q019", "ورود با SAML گیر میکنه", "T-145", "Access", "SSO login redirect loop", True),
    ("Q020", "فایل export فقط سرستون داره", "T-151", "Data Export", "CSV export empty except headers", True),
    ("Q021", "ERP موجودی با سایت فرق داره", "T-167", "Integration", "ERP inventory mismatch with shop", True),
    ("Q022", "تمدید اشتراک انجام نشده", "T-131", "Subscription", "subscription not renewed", False),
    ("Q023", "لینک reset password expire میشه", "T-011", "Password Reset", "password reset link expired", False),
    ("Q024", "سفارش لغو کردم هنوز آماده‌سازی میشه", "T-031", "Order", "cancelled order still processing", True),
    ("Q025", "جستجوی فارسی جواب نمیده", "T-083", "Search", "Persian search returns no results", True),
]


def generate_dates(n: int) -> list[str]:
    start = datetime(2026, 1, 5, 8, 0)
    dates = []
    for i in range(n):
        day_offset = random.randint(0, 250)
        hour = random.randint(8, 20)
        minute = random.choice([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])
        dt = start + timedelta(days=day_offset, hours=hour - 8, minutes=minute)
        dates.append(dt.strftime("%Y-%m-%d %H:%M"))
    dates.sort()
    return dates


def build_tickets() -> list[dict]:
    rows = []
    ticket_num = 1
    for category in CATEGORIES:
        items = TICKETS[category]
        assert len(items) == 10, f"Category {category} must have 10 tickets"
        for item in items:
            title, desc, product, priority, status, ctype, resolution, is_hard, _ = item
            rows.append({
                "ticket_id": f"T-{ticket_num:03d}",
                "title": title,
                "description": desc,
                "category": category,
                "product": product,
                "priority": priority,
                "status": status,
                "created_at": "",
                "customer_type": ctype,
                "resolution": resolution,
                "_is_hard": is_hard,
            })
            ticket_num += 1
    assert len(rows) == 200
    dates = generate_dates(200)
    for i, row in enumerate(rows):
        row["created_at"] = dates[i]
        del row["_is_hard"]
    return rows


def write_csv(path: str, rows: list[dict], fieldnames: list[str]):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(rows)


def count_hard_cases() -> int:
    count = 0
    for cat in CATEGORIES:
        for item in TICKETS[cat]:
            if item[7]:
                count += 1
    return count


def count_semantic_groups() -> int:
    groups = set()
    for cat in CATEGORIES:
        for item in TICKETS[cat]:
            if item[8]:
                groups.add(item[8])
    return len(groups)


def write_readme(hard_count: int, group_count: int):
    content = """# Customer Support Tickets Dataset — Semantic Search Demo

## 1. Dataset چیست؟

این مجموعه داده شامل **200 تیکت پشتیبانی مشتری** به زبان فارسی است که برای Demo سیستم **Semantic Search** طراحی شده است. هر تیکت یک مشکل واقعی‌نما از محصولات SaaS/e-commerce فرضی (Web Platform، Mobile App، Dashboard، Checkout، Customer Portal) را توصیف می‌کند.

## 2. تعداد رکوردها

| مورد | تعداد |
|------|-------|
| تیکت‌ها | 200 |
| دسته‌بندی (Category) | 20 |
| Query تست | 25 |
| Hard semantic cases | ~{hard_count} |
| گروه‌های معنایی نزدیک | {group_count} |

## 3. Categoryها

Authentication · Password Reset · Payment · Order · Refund · Shipping · Delivery Tracking · Product · Search · Dashboard · Notification · Mobile App · Account · Subscription · Access · Data Export · Integration · Performance · Security · Customer Support

هر دسته **10 تیکت** دارد (جمعاً 200).

## 4. Semantic Search چه چیزی را باید نشان دهد؟

سیستم باید بتواند تیکت‌های مرتبط را **بر اساس معنا** پیدا کند، نه فقط تطابق کلمه‌به‌کلمه. مثلاً:

- Query: «پول از حسابم کم شده ولی سفارش ثبت نشده»
- Ticket: «مبلغ از حساب مشتری کسر شده اما سفارش در سیستم ایجاد نشده است.»

کلمات مشترک محدودند، اما مفهوم یکسان است.

## 5. Queryهای نمونه

| Query ID | Query | Expected Ticket |
|----------|-------|-----------------|
| Q001 | پول از حسابم کم شده ولی سفارش ثبت نشده | T-021 |
| Q002 | هر بار لاگین می‌کنم دوباره منو می‌فرسته صفحه ورود | T-001 |
| Q003 | بسته ارسال شده ولی کد رهگیری هیچ چیزی نشون نمی‌ده | T-061 |
| Q005 | پول رو دادم ولی خریدم تو حسابم نیست | T-022 |
| Q014 | اشتراک cancel کردم هنوز پول میگیره | T-132 |

فایل کامل: `semantic_search_test_queries.csv`

## 6. چرا این Dataset برای Semantic Search مناسب است؟

1. **تنوع زبانی**: رسمی، محاوره‌ای، کوتاه، توضیحی، ناراضی — برای یک مفهوم بیان‌های مختلف
2. **Hard cases (~{hard_count})**: Query و Ticket واژگان متفاوت، معنا یکسان
3. **Semantic clusters ({group_count} گروه)**: چند تیکت نزدیک معنایی برای تست Ranking (مثلاً pay_no_order: کسر شد ولی سفارش نیست / پرداخت موفق ولی سفارش نیست / پرداخت خطا و کسر نشد)
4. **بدون تکرار مکانیکی**: عنوان و توضیحات هر تیکت منحصربه‌فرد
5. **Metadata غنی**: category، product، priority برای فیلتر و Demo

## فایل‌ها

- `customer_support_tickets_200.csv` — Dataset اصلی
- `semantic_search_test_queries.csv` — Queryهای تست با expected_ticket
- `README.md` — این سند

## Schema

### Tickets
`ticket_id, title, description, category, product, priority, status, created_at, customer_type, resolution`

### Test Queries
`query_id, query, expected_ticket, expected_category, reason`

## بهترین Ticket/Query Pairها برای Demo

### Demo 1 — پرداخت بدون سفارش
- **Query (Q001)**: پول از حسابم کم شده ولی سفارش ثبت نشده
- **Ticket (T-021)**: مبلغ کسر شد ولی سفارش ثبت نشده
- **نکته Ranking**: T-022 و T-035 هم نزدیک‌اند؛ T-023 (پرداخت خطا) باید پایین‌تر باشد

### Demo 2 — لوپ ورود
- **Query (Q002)**: هر بار لاگین می‌کنم دوباره منو می‌فرسته صفحه ورود
- **Ticket (T-001)**: بعد از ورود دوباره به صفحه لاگین برمی‌گردم
- **Cluster**: T-002, T-004 هم auth_loop

### Demo 3 — رهگیری بی‌اطلاعات
- **Query (Q003)**: بسته ارسال شده ولی کد رهگیری هیچ چیزی نشون نمی‌ده
- **Ticket (T-061)**: کد رهگیری چیزی نشون نمیده
- **Cluster**: T-062 هم tracking_stale

### Demo 4 — استرداد معوق
- **Query (Q004)**: پول سفارشی که لغو کردم هنوز بهم برنگشته
- **Ticket (T-041)**: درخواست استرداد دادم ولی پول برنگشته

---
*Generated for Semantic Search Demo — ProductMe*
""".format(hard_count=hard_count, group_count=group_count)

    with open("README.md", "w", encoding="utf-8") as f:
        f.write(content)


def main():
    tickets = build_tickets()
    fields = [
        "ticket_id", "title", "description", "category", "product",
        "priority", "status", "created_at", "customer_type", "resolution",
    ]
    write_csv("customer_support_tickets_200.csv", tickets, fields)

    query_rows = [
        {
            "query_id": q[0],
            "query": q[1],
            "expected_ticket": q[2],
            "expected_category": q[3],
            "reason": q[4],
        }
        for q in TEST_QUERIES
    ]
    write_csv(
        "semantic_search_test_queries.csv",
        query_rows,
        ["query_id", "query", "expected_ticket", "expected_category", "reason"],
    )

    hard = count_hard_cases()
    groups = count_semantic_groups()
    write_readme(hard, groups)

    print(f"Generated 200 tickets, {len(TEST_QUERIES)} queries")
    print(f"Hard semantic cases: {hard}")
    print(f"Semantic groups: {groups}")


if __name__ == "__main__":
    main()
