# 11-dars: Ma’lumotlar bazasi va relyatsion model asoslari

**Iqtisodiyot, Menejment va Yurisprudensiya** yo‘nalishlari talabalari uchun tayyorlangan 100% oflayn interaktiv HTML prezentatsiya (42 slayd, 7 bob) va Python + SQLite amaliy loyihasi.

- **Onlayn ko‘rish (GitHub Pages yoqilganda):** https://s404ruz.github.io/dasturlash-asoslari/11-dars/
- **Oflayn ko‘rish:** `index.html` faylini istalgan brauzerda to‘g‘ridan-to‘g‘ri oching (internet talab qilinmaydi).

---

## Mavzu tarkibi (7 bob • 42 slayd)

| Bob | Mavzu | Asosiy elementlar |
| --- | --- | --- |
| **1-bob** | Ma’lumotlar bazasi va MBBT tushunchalari | Ma’lumot vs Axborot, CSV cheklovlari, MBBT SVG arxitekturasi, MB turlari, mini-viktorina |
| **2-bob** | Relyatsion model asoslari | E. Kodd modeli, jadval anatomiyasi (SVG), `CREATE TABLE`, 5 qoida, ma’lumot turlari va `NULL` |
| **3-bob** | Kalitlar va ma’lumotlar yaxlitligi | PK, nomzod/surrogat kalit, FK (SVG), `PRAGMA foreign_keys = ON`, `NOT NULL / UNIQUE / CHECK / DEFAULT` |
| **4-bob** | Jadvallararo bog‘liqliklar va loyihalash | ER-model (SVG), 1:N / 1:1 / N:M oraliq jadval, **interaktiv 1NF → 2NF → 3NF laboratoriyasi** |
| **5-bob** | SQLite tizimi arxitekturasi | Serversiz vs Mijoz-server (SVG), 6 ichki qatlam, sahifalar va `sqlite_master`, `STRICT`, ACID |
| **6-bob** | Python’da `sqlite3` moduli bilan tanishish | `Connection` / `Cursor`, DDL, `PRAGMA`, **interaktiv SQL-in’ektsiya simulyatori**, `with` va istisnolar |
| **7-bob** | Kompleks amaliy mashg‘ulot | Yuridik firma MB (7 jadval, 3NF ER-sxema), 7 ta avtomatik yaxlitlik sinovi, mustaqil topshiriqlar |

---

## Prezentatsiya imkoniyatlari va klavishlar

- **100% oflayn:** lokal `vendor/lucide.min.js` vektor ikonkalari, ichki Python/SQL sintaksis yoritish va 11 ta inline SVG diagramma.
- **Yorug‘ (proyektorga qulay) + Tungi rejim**, **PDF eksport** (`A4 landscape`) va bosqichma-bosqich ochilish (fragmentlar).

| Klavish | Vazifasi |
| --- | --- |
| `→` yoki `Space` | Keyingi fragment / slayd |
| `←` | Oldingi fragment / slayd |
| `M` | 7 bob bo‘yicha navigatsiya menyusi |
| `O` | Barcha slaydlar panjarasi (Overview) |
| `D` | Yorug‘ / Tungi rejim (Dark Mode) |
| `F` | To‘liq ekran rejimi |
| `Ctrl + P` | PDF qilib saqlash |

---

## 7-bob amaliy loyihasini ishga tushirish

`yuridik_firma_mb.py` dasturi yuridik firma uchun 7 jadvalli (3NF) SQLite ma’lumotlar bazasini yaratadi, namunaviy yozuvlarni kiritadi va 7 ta yaxlitlik sinovini bajaradi:

```bash
python yuridik_firma_mb.py
```

Dastur ishga tushgach quyidagi fayllarni avtomatik yaratadi:
- `data/yuridik_firma.db` — tayyor SQLite ma’lumotlar bazasi
- `natijalar/sxema_hisoboti.txt` — barcha jadvallar, PK/FK va satrlar hisoboti
- `natijalar/yaxlitlik_sinovlari.csv` — 7 ta sinovning batafsil natijalari (`7 / 7`)

---

## Papka tuzilmasi

```text
11-dars/
├── README.md
├── index.html            # 42 ta slayd va inline SVG diagrammalar
├── style.css             # Light/Dark dizayn va PDF print stillari
├── app.js                # Navigatsiya, fragmentlar, sintaksis yoritish va interaktiv lablar
├── yuridik_firma_mb.py   # 7-bob yuridik firma MB va yaxlitlik sinovlari dasturi
└── vendor/
    ├── lucide.min.js     # Rasmiy Lucide vektor ikonkalari (oflayn)
    ├── fonts.css         # Lokal Montserrat (600/700) va Open Sans (400) shriftlari
    └── fonts/            # Oflayn .woff2 shrift fayllari
```
