# VOGAUTO — Management vânzări auto

Sistem de management al vânzărilor pentru dealer auto, construit cu **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **MongoDB (Mongoose)** și **NextAuth.js**.

Interfața este integral în limba română.

---

## Tehnologii
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- MongoDB cu Mongoose
- Autentificare: NextAuth.js (CredentialsProvider, JWT, expirare 1 oră)
- Parole: bcryptjs
- Grafice: recharts · Export Excel: exceljs · Notificări: react-hot-toast

## Autentificare
Login pe **nume de utilizator** (nu email). Cont admin implicit: **`admin` / `Admin1234!`**.

## Roluri
- **Admin** — acces complet: prezentare generală, vânzări (tabel Excel cu editare inline, profit editabil, alegere vânzător), statistici, **manageri** (profit & comision per manager), jurnal audit, utilizatori (cu procent de comision), export Excel.
- **Angajat (worker)** — formularul de înregistrare vânzare (cu **profit**) + pagina **„Vânzările mele”** (totaluri lunare proprii + comision). Nu vede listele, prețurile de cumpărare ale altora sau datele altor angajați.

---

## Configurare

### 1. Instalează dependențele
```bash
npm install
```

### 2. Variabile de mediu — `.env.local`
```
MONGODB_URI=mongodb+srv://user1:PAROLA_REALA@cluster0.c3vjndq.mongodb.net/parcare?retryWrites=true&w=majority&appName=Cluster0
NEXTAUTH_SECRET=<generat cu: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3002
```
> Înlocuiește `PAROLA_REALA` cu parola utilizatorului MongoDB. În MongoDB Atlas, asigură-te că IP-ul tău este permis (Network Access → Add IP).

### 3. Creează primul administrator
```bash
npm run seed
```
Creează (sau actualizează) contul admin — login: **admin** / parolă: **Admin1234!**

### 4. Pornește aplicația
```bash
npm run dev
```
Accesează **http://localhost:3002** și autentifică-te cu contul de admin.

---

## Structura

```
/app
  /login                              — pagina de login (NextAuth)
  /dashboard
    /page.tsx                         — admin: dashboard | worker: formular vânzare
    /cars                             — tabel vânzări tip Excel (admin)
    /statistics                       — grafice și analize (admin)
    /audit                            — jurnal de activitate (admin)
    /users                            — gestiune utilizatori (admin)
  /api
    /auth/[...nextauth]               — NextAuth
    /cars · /cars/[id] · /cars/[id]/reveal-phone
    /users · /users/[id]
    /stats · /audit · /export
/components   — ui, layout, dashboard, sales, cars, statistics, audit, users
/lib          — mongodb, authOptions, audit, guard, utils
/models       — User, Car, AuditLog (Mongoose)
/scripts/seed.ts — creează primul admin
middleware.ts — protejează /dashboard și blochează workerii de la paginile de admin
```

## Securitate
- Toate rutele API verifică sesiunea și rolul (workerii primesc 403 pe `GET /api/cars`).
- Workerii pot doar `POST /api/cars`.
- Parolele nu sunt niciodată returnate de API.
- Prețul de cumpărare nu este setat de workeri.
- Telefoanele clienților sunt mascate în tabel (`079***456`); dezvăluirea completă se face la click și se înregistrează în jurnal (`REVEAL_PHONE`).
- Sesiuni JWT cu expirare 1 oră; `/dashboard/*` protejat de middleware.

## Acțiuni înregistrate în jurnal
`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `CREATE_SALE`, `EDIT_SALE`, `DELETE_SALE`, `CREATE_USER`, `EDIT_USER_PERMISSIONS`, `DELETE_USER`, `DOWNLOAD_EXCEL`, `VIEW_STATISTICS`, `REVEAL_PHONE` — cu IP, oraș, țară (ip-api.com), dispozitiv și browser.
