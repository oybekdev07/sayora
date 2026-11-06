# Sayyora — Firebase tayyorlash

Bu repository Firebase Realtime Database uchun boshlang'ich sozlamalarni o'z ichiga oladi. Hozircha baza qoidalari barcha to'g'ridan-to'g'ri o'qish va yozishni bloklaydi. Bu PIN xeshlari, obunachi ma'lumotlari va o'yin balanslarini begonalardan himoya qilish uchun; hozirgi HTML esa bazaga bevosita ulanadigan qilib yozilgan, shuning uchun ushbu qoidalar bilan hali ishlamaydi. Ishlaydigan server API va frontend ulanishini keyingi bosqichda moslashtirish kerak.

## Firebase loyihasini ulash

1. Firebase Console'da loyiha yarating va Realtime Database'ni yoqing.
2. Realtime Database URL'ini oling (`https://<project>-default-rtdb.firebaseio.com` yoki console ko'rsatgan URL).
3. Kompyuterda Firebase CLI o'rnating va hisobingizga kiring:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
4. Ushbu repository papkasida:
   ```bash
   firebase use --add
   firebase deploy --only database
   ```
   Loyiha ID'ni buyruq so'raganda Firebase Console'dagi ID bilan tanlang.

## Muhim

- Firebase loyiha ID'si va database URL maxfiy kalit emas, lekin bazaga kirish qoidalari xavfsiz bo'lishi shart.
- Service-account JSON, admin paroli, PIN yoki boshqa maxfiy kalitlarni GitHub'ga yoki chatga joylamang.
- `database.rules.json` dagi hamma narsani bloklovchi qoidani hozircha yumshatmang. Sayt ishlashi uchun avval server API va foydalanuvchini tekshirish (authentication/authorization) qo'shilishi kerak.
- Berilgan HTML'dagi `API` va `DBURL` bo'sh. Firebase'ni yaratish va deploy qilish GitHub orqali avtomatik bajarilmaydi; loyiha egasi Firebase Console'da loyiha ochishi kerak.
