# Sayyora — Firebase tayyorlash

Repositoryda Firebase Realtime Database va Cloud Functions uchun boshlang'ich backend bor. Database qoidalari brauzerdan to'g'ridan-to'g'ri o'qish/yozishni yopadi; `functions/` ichidagi API obunachi so'rovlari va admin amallarini serverda bajaradi.

## Firebase'ni sozlash va deploy qilish

1. Firebase Console'da loyiha yarating, **Realtime Database**'ni yoqing va billing/Blaze rejasini ulang (Cloud Functions deploy uchun billing talab qilinishi mumkin).
2. Lokal kompyuteringizda Node.js 20+ va Firebase CLI o'rnating:
   ```bash
   npm install -g firebase-tools
   firebase login
   git clone https://github.com/oybekdev07/sayora.git
   cd sayora
   firebase use --add
   ```
   So'ralganda Firebase Console'dagi loyiha ID'sini tanlang.
3. Admin panel uchun kuchli, noyob parolni Firebase Secret Manager'ga kiriting:
   ```bash
   firebase functions:secrets:set ADMIN_PASSWORD
   ```
   Parolni GitHub fayliga qo'ymang. Bu parol admin sahifadagi parol maydonida ham ishlatiladi.
4. Deploy qiling:
   ```bash
   firebase deploy --only database,functions
   ```
5. Deploy tugagach, `api` function URL'i odatda quyidagi ko'rinishda bo'ladi:
   `https://us-central1-LOYIHA_ID.cloudfunctions.net/api`

   Firebase Hosting/Pages domeningizni cheklash uchun deploydan oldin `ALLOWED_ORIGINS` environment qiymatini vergul bilan ajratilgan aniq originlar bilan o'rnating (masalan, `https://example.web.app`). CORS o'zi autentifikatsiya emas; admin parolini va database qoidalarini baribir himoyalang.

## Backend endpoint'lari

- `POST /join` — username'ni qabul qiladi, ruxsat varsa `{"status":"ok"}`, bo'lmasa kutayotganlar ro'yxatiga yozib `{"status":"wait"}` qaytaradi. `config/autoApprove=true` bo'lsa, so'rovlarni avtomatik tasdiqlaydi.
- `POST /adm` — `ADMIN_PASSWORD` talab qiladi; `check`, `pending`, `mode`, `approve`, `reject`, `allow`, `grant` amallarini bajaradi.
- `POST /order` — hozircha ataylab `503 payment_not_configured` qaytaradi. Payme merchant credentials va imzosi tekshiriladigan webhook байхгүй тул төлбөрийг баталгаажуулж чадахгүй; бодит төлбөрийн интеграц хийхээс өмнө токен/премиум өгөх ёсгүй.

## Muhim: frontend hali to'liq ulangan emas

Repositoryda hozir faqat Firebase konfiguratsiyasi va backend bor; siz yuborgan `index (1).html` fayli repositoryda yo'q. Uni `index.html` nomi bilan repositoryga qo'shish kerak. Fayldagi `API` qiymatini yuqoridagi Function URL'iga qo'ying. Admin endpoint'ga parol `body.pass` orqali yuborilayotganligi sababli, frontendda `adm()` funksiyasini `x-admin-password` header ishlatadigan qilib o'zgartirish tavsiya etiladi.

Bu backend **faqat** `/join` va `/adm` oqimlarini serverda bajaradi. HTML qolgan o'yin ma'lumotlari, marketplace va galaktikani `DBURL` orqali to'g'ridan-to'g'ri o'qib/yozadi; hozirgi yopiq database rules bilan ular ishlamaydi. Ishga tushirish uchun frontendni authenticated API'ga refactor qilish (yoki Firebase Auth asosida qat'iy rules хийх) шаардлагатай. Rules'ийг `read/write: true` болгож нээх нь PIN хэш, хэрэглэгчийн өгөгдөл, тоглоомын баланс болон admin үйлдлийг хамгаалалтгүй болгоно.
