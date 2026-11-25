# Naya client portal theme kaise banaye

Yeh guide un developers ke liye hai jo ek naya broker theme/layout banana chahte hain (jaise meridian, terminal, pulse, bento bane hain).

## 1. Basic idea

Har portal ek alag Next.js project hai. Uske andar teen hisse hain:

```text
src/
├── app/     → routes + /api proxy routes      (SHARED – sab portals me same)
├── core/    → API calls, hooks, i18n, logic   (SHARED – sab portals me same)
│   └── broker/config.ts                       (PER BROKER – sirf yeh core file alag)
├── proxy.ts                                   (SHARED)
└── theme/   → poora design / layout           (PER THEME – sirf yahan naya kaam)
public/brand/                                  (PER BROKER – logos, favicon)
```

Rule: **naya theme banane ke liye sirf `src/theme/`, `src/core/broker/config.ts`, `public/brand/`, `package.json` (port) aur `.env.local` change karo.** `src/app` aur `src/core` ko haath mat lagao. Woh `scripts/sync-core.sh` se meridian se copy hote hain.



## 2. Naya portal setup (step by step)

1. Meridian ko copy karo (node_modules aur .next ke bina). Folder ka naam `client_portal_<broker>-<theme>` hona chahiye, warna sync script use nahi dhoondhegi:
   ```shell
   rsync -a --exclude node_modules --exclude .next client_portal_srglobalmarkets-meridian/ client_portal_<broker>-<theme>/
   ```
2. `package.json` me `name` aur `dev`/`start` ka port badlo (`next dev -p <naya-port>`). Har portal ka port alag hona chahiye.
3. `.env.local.example` se `.env.local` banao aur values bharo.
4. Logos `crmfronend/public/clients/<slug>/` se `public/brand/` me copy karo (crmfronend me kuch edit mat karna). Purane brand ki files hata do.
5. `src/core/broker/config.ts` me broker ki values bharo (neeche section 3).
6. `src/theme/` me apna design banao (section 4 aur 5).
7. `npm install` → `npm run typecheck` → `npm run dev`.
8. Meridian folder se sync check karo: `bash scripts/sync-core.sh` (dry run), phir `bash scripts/sync-core.sh --apply`.
9. QA checks chalao (section 7).

## 3. `src/core/broker/config.ts`

Type `src/core/broker/types.ts` me `BrandConfig` hai. Saare fields bharna zaroori hai. Values purane portal ke `crmfronend/config/clients/<slug>.config.js` se lo:

- `slug`, `brandName`, `companyName`, `supportEmail`
- `logo.light` / `logo.dark` – `{ src, width, height }` (asli image size daalo)
- `appIcon`, `favicon`
- `allowedModes` (`['light','dark']` ya sirf ek), `defaultMode`, `followSystem`
- Auth page text: `loginWelcomeTitle`, `registerWelcomeTitle`, `promoHeadline`, `promoDescription`, `trustPoints`
- Legal: `footerCopyright`, `legalText`, `termsUrl`, `privacyUrl`, `registrationDisclaimer`
- `dashboard`: `hideTradeButton`, `splitCreateAccountCta`, `hideDepositBanner`, `createAccountFlow` (`'cards'` ya `'dropdown'`), optional `depositBannerTitle` / `depositBannerText`

## 4. Theme contract – yeh files aur exports hone hi chahiye

`src/app` ke pages inhi naam se theme se import karte hain. File path aur export naam same rakho, andar ka design kuch bhi ho sakta hai.


Root files:
- `theme/meta.ts` → `fontClassName`, `themeViewport`, `pageTitles` (root `app/layout.tsx` inhe use karta hai)
- `theme/tokens.css` → saare colour / font / spacing CSS variables
- `theme/ui/Feedback.tsx` → `StatusBadge` bhi export karna zaroori hai (`core/pages/TransferForm.tsx` ise use karta hai)

Kisi theme file ko hatane ya rename karne se pehle `src/app` aur `src/core` me `@/theme/` imports search karo.

Props aur data: theme pages kabhi khud API call nahi karte. Data hamesha core hooks se aata hai (jaise dashboard ke liye `core/dashboard/useDashboardView.ts`, baaki pages ke liye `core/pages/use*.ts`). Naya page banate waqt meridian ka same page kholo aur dekho woh kaunse hook aur fields use karta hai. Wahi fields tumhare design me bhi dikhne chahiye.

## 5. Design rules (CSS classes)

1. **Components me koi hard-coded colour nahi.** Har colour `tokens.css` ke variables se aana chahiye (`--brand-primary`, `--bg-surface`, `--text-primary`, `--border`, `--focus-ring`, ...). Naya theme = pehle naya `tokens.css`, light aur dark dono modes ke saath. Meridian ke `tokens.css` me jitne variables hain, sab define karo.
2. **Yeh shared UI files ke class names same rakhne hain** (styles badal sakte ho, class ka naam nahi):
   - `ui/ui.module.css` (48 classes)
   - `auth/forms.module.css` (14 classes)
   - `ui/BrandLogo.module.css` (4 classes)
   - `ui/ThemeToggle.module.css` (3 classes)

   Kuch shared components in classes ko naam se use karte hain. Naam badla toh styling chupchaap gayab ho jaayegi.
3. **Layout files tumhari apni hain:** `shell/AppShell.*`, `auth/AuthLayout.*`, `dashboard/dashboard.module.css`, `history/`, `deposit/`, `accounts/`, `transfer/` ke CSS modules. Inme class names kuch bhi rakh sakte ho.
4. **TSX me jo `styles.xyz` likho, woh CSS me define hona chahiye.** Undefined class pe error nahi aata, bas styling apply nahi hoti. Isliye neeche wala class audit zaroor chalao.
5. Text hamesha i18n se lo (`t('...')`). Strings hard-code mat karo. Agar naya key chahiye toh woh `src/core/i18n/messages/` me jaata hai, toh woh meridian me add karke sync karo.
6. Responsive: 375px (phone), 768px (tablet), 1280px (desktop) teeno pe layout check karo. Horizontal scroll, kata hua text ya ek dusre pe chadhe buttons nahi hone chahiye.
7. Contrast: text vs background kam se kam 4.5:1 (light aur dark dono me).

## 6. Shared code (core/app) badalna ho toh

- Change **sirf meridian me** karo.
- Meridian folder me `bash scripts/sync-core.sh` chalao (dry run, sirf dikhata hai kya badlega).
- Sab theek lage toh `bash scripts/sync-core.sh --apply`. `--apply` ke bina kuch copy nahi hota.
- Script `src/core/**` (`broker/config.ts` chhod ke), `src/app/**` aur `src/proxy.ts` copy karti hai. `src/theme`, `public/brand`, `.env*` aur `package.json` ko nahi chhuti.
- Sync ke baad har portal me `npm run typecheck` chalao.

## 7. Done kehne se pehle checklist

- [ ] `npm run typecheck` clean
- [ ] `npm run build` pass
- [ ] Login → dashboard → accounts → deposit → withdrawal → transfer → history → KYC sab khulte hain (demo login: `demo@gmail.com` / `password`)
- [ ] Light aur dark mode dono theek dikhte hain (agar `allowedModes` me dono hain)
- [ ] 375 / 768 / 1280 widths pe layout theek hai
- [ ] Class audit me MISSING 0 aur shared CSS "SAME in all" (script `crmwebadmin/.tenaxcode/notes/cp-class-audit.js` – naya portal `PORTALS` list me add karo, phir `node cp-class-audit.js`)
- [ ] Naya portal QA scripts (`cp-field-parity.js`, `cp-align-audit.js`, `cp-login-check.js`, `cp-visual-qa.js`) me add karke chalaya
- [ ] `src/core` meridian se identical hai (sirf `broker/config.ts` alag):
  ```shell
  diff -rq client_portal_srglobalmarkets-meridian/src/core client_portal_<naya>/src/core
  ```
