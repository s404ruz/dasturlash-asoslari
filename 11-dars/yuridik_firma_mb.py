"""11-mavzu, 7-bob: Yuridik firma ma'lumotlar bazasi loyihasi.

Ushbu dastur 7 ta normallashtirilgan (3NF) jadvaldan iborat SQLite bazasini
yaratadi, namunaviy ma'lumotlarni kiritadi, 7 ta yaxlitlik sinovini o'tkazadi
hamda sxema hisobotini TXT va sinov natijalarini CSV fayllarga yozadi.
"""

import csv
import sqlite3
import sys
from contextlib import closing
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
BAZA_FAYLI = BASE_DIR / "data" / "yuridik_firma.db"
HISOBOT_KATALOGI = BASE_DIR / "natijalar"

SXEMA = """
CREATE TABLE IF NOT EXISTS mijozlar (
    mijoz_id INTEGER PRIMARY KEY,
    nomi     TEXT NOT NULL,
    toifa    TEXT NOT NULL CHECK (toifa IN ('jismoniy', 'yuridik')),
    stir     TEXT UNIQUE,
    telefon  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS advokatlar (
    advokat_id INTEGER PRIMARY KEY,
    familiya   TEXT NOT NULL,
    ism        TEXT NOT NULL,
    litsenziya TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS xizmatlar (
    xizmat_id INTEGER PRIMARY KEY,
    nomi      TEXT    NOT NULL UNIQUE,
    narx      INTEGER NOT NULL CHECK (narx > 0)
);

CREATE TABLE IF NOT EXISTS shartnomalar (
    shartnoma_id INTEGER PRIMARY KEY,
    raqam        TEXT    NOT NULL UNIQUE,
    mijoz_id     INTEGER NOT NULL
                 REFERENCES mijozlar(mijoz_id) ON DELETE RESTRICT,
    sana         TEXT    NOT NULL,
    holat        TEXT    NOT NULL DEFAULT 'faol'
                 CHECK (holat IN ('faol', 'yakunlangan', 'bekor'))
);

CREATE TABLE IF NOT EXISTS shartnoma_xizmatlari (
    shartnoma_id INTEGER NOT NULL
                 REFERENCES shartnomalar(shartnoma_id) ON DELETE CASCADE,
    xizmat_id    INTEGER NOT NULL REFERENCES xizmatlar(xizmat_id),
    miqdor       INTEGER NOT NULL DEFAULT 1 CHECK (miqdor > 0),
    PRIMARY KEY (shartnoma_id, xizmat_id)
);

CREATE TABLE IF NOT EXISTS shartnoma_advokat (
    shartnoma_id INTEGER NOT NULL
                 REFERENCES shartnomalar(shartnoma_id) ON DELETE CASCADE,
    advokat_id   INTEGER NOT NULL REFERENCES advokatlar(advokat_id),
    rol          TEXT    NOT NULL DEFAULT 'yordamchi'
                 CHECK (rol IN ('asosiy', 'yordamchi')),
    PRIMARY KEY (shartnoma_id, advokat_id)
);

CREATE TABLE IF NOT EXISTS tolovlar (
    tolov_id     INTEGER PRIMARY KEY,
    shartnoma_id INTEGER NOT NULL
                 REFERENCES shartnomalar(shartnoma_id) ON DELETE RESTRICT,
    sana         TEXT    NOT NULL,
    summa        INTEGER NOT NULL CHECK (summa > 0),
    usul         TEXT    NOT NULL CHECK (usul IN ('naqd', 'karta', 'otkazma'))
);
"""

NAMUNA = """
INSERT INTO mijozlar VALUES
    (1, 'Karimov Anvar', 'jismoniy', NULL, '+998901112233'),
    (2, '“Baraka Savdo” MChJ', 'yuridik', '305123456', '+998712223344');

INSERT INTO advokatlar VALUES
    (1, 'Rahimov', 'Botir', 'LT-0101'),
    (2, 'Sobirova', 'Dilnoza', 'LT-0102');

INSERT INTO xizmatlar VALUES
    (1, 'Konsultatsiya', 500000),
    (2, 'Shartnoma ekspertizasi', 800000),
    (3, 'Sudda vakillik', 3000000);

INSERT INTO shartnomalar (shartnoma_id, raqam, mijoz_id, sana) VALUES
    (1, 'SH-2026-001', 1, '2026-03-15'),
    (2, 'SH-2026-002', 2, '2026-04-02');

INSERT INTO shartnoma_xizmatlari VALUES (1, 1, 2), (2, 2, 1), (2, 3, 1);

INSERT INTO shartnoma_advokat VALUES
    (1, 1, 'asosiy'), (2, 2, 'asosiy'), (2, 1, 'yordamchi');

INSERT INTO tolovlar (shartnoma_id, sana, summa, usul) VALUES
    (1, '2026-03-15', 1000000, 'karta'),
    (2, '2026-04-02', 2000000, 'otkazma');
"""

# Har bir sinov: (tavsif, SQL, kutilgan natija)
SINOVLAR = [
    (
        "Mavjud bo‘lmagan mijozga shartnoma",
        "INSERT INTO shartnomalar (raqam, mijoz_id, sana) "
        "VALUES ('SH-2026-003', 99, '2026-05-01')",
        "rad",
    ),
    (
        "Takroriy shartnoma raqami",
        "INSERT INTO shartnomalar (raqam, mijoz_id, sana) "
        "VALUES ('SH-2026-001', 1, '2026-05-01')",
        "rad",
    ),
    (
        "Manfiy to‘lov summasi",
        "INSERT INTO tolovlar (shartnoma_id, sana, summa, usul) "
        "VALUES (1, '2026-05-01', -500, 'naqd')",
        "rad",
    ),
    (
        "Noma’lum to‘lov usuli",
        "INSERT INTO tolovlar (shartnoma_id, sana, summa, usul) "
        "VALUES (1, '2026-05-01', 500, 'kripto')",
        "rad",
    ),
    (
        "Advokatni bitta shartnomaga ikki marta biriktirish",
        "INSERT INTO shartnoma_advokat VALUES (1, 1, 'yordamchi')",
        "rad",
    ),
    (
        "To‘lovi bor shartnomani o‘chirish",
        "DELETE FROM shartnomalar WHERE shartnoma_id = 1",
        "rad",
    ),
    (
        "To‘g‘ri to‘lov qo‘shish",
        "INSERT INTO tolovlar (shartnoma_id, sana, summa, usul) "
        "VALUES (1, '2026-05-10', 500000, 'naqd')",
        "qabul",
    ),
]


def ulanish_ochish(fayl: Path) -> sqlite3.Connection:
    """Tashqi kalitlar yoqilgan ulanish qaytaradi."""
    ulanish = sqlite3.connect(fayl)
    ulanish.execute("PRAGMA foreign_keys = ON")
    return ulanish


def sxemani_yaratish(ulanish: sqlite3.Connection) -> None:
    """Barcha jadvallarni yaratadi va bo‘sh bo‘lsa namunaviy ma’lumot qo‘shadi."""
    with ulanish:
        ulanish.executescript(SXEMA)

    mijozlar_soni = ulanish.execute("SELECT COUNT(*) FROM mijozlar").fetchone()[0]

    if mijozlar_soni == 0:
        with ulanish:
            ulanish.executescript(NAMUNA)


def yaxlitlikni_sinash(ulanish: sqlite3.Connection) -> list[dict[str, str]]:
    """Har bir sinovni alohida tranzaksiyada bajaradi va natijalarni qaytaradi."""
    natijalar = []

    for tavsif, sorov, kutilgan in SINOVLAR:
        try:
            with ulanish:
                ulanish.execute(sorov)
            haqiqiy, izoh = "qabul", ""
        except sqlite3.IntegrityError as xatolik:
            haqiqiy, izoh = "rad", str(xatolik)

        natijalar.append(
            {
                "sinov": tavsif,
                "kutilgan": kutilgan,
                "haqiqiy": haqiqiy,
                "mos": "ha" if kutilgan == haqiqiy else "yo‘q",
                "izoh": izoh,
            }
        )

    return natijalar


def sxema_malumotlari(ulanish: sqlite3.Connection) -> list[dict[str, object]]:
    """Har bir jadval uchun ustunlar, kalitlar va satrlar sonini yig‘adi."""
    malumot = []

    jadvallar = [
        r[0]
        for r in ulanish.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
        )
    ]

    for jadval in jadvallar:
        ustunlar = ulanish.execute(f"PRAGMA table_info({jadval})").fetchall()
        tashqi = ulanish.execute(f"PRAGMA foreign_key_list({jadval})").fetchall()
        satrlar = ulanish.execute(f"SELECT COUNT(*) FROM {jadval}").fetchone()[0]

        malumot.append(
            {
                "jadval": jadval,
                "ustunlar": len(ustunlar),
                "pk": ", ".join(u[1] for u in ustunlar if u[5]),
                "fk": ", ".join(f"{fk[3]}->{fk[2]}" for fk in tashqi),
                "satrlar": satrlar,
            }
        )

    return malumot


def hisobotlarni_yozish(
    katalog: Path,
    sxema: list[dict[str, object]],
    sinovlar: list[dict[str, str]],
) -> None:
    """Sxema hisobotini TXT, sinov natijalarini CSV faylga yozadi."""
    katalog.mkdir(parents=True, exist_ok=True)

    with (katalog / "sxema_hisoboti.txt").open("w", encoding="utf-8") as fayl:
        fayl.write("YURIDIK FIRMA MA’LUMOTLAR BAZASI SXEMASI\n")
        fayl.write("=" * 40 + "\n")
        for j in sxema:
            fayl.write(f"\n{j['jadval']}\n")
            fayl.write(f"  Ustunlar soni : {j['ustunlar']}\n")
            fayl.write(f"  Birlamchi kalit: {j['pk']}\n")
            fayl.write(f"  Tashqi kalitlar: {j['fk'] or '—'}\n")
            fayl.write(f"  Satrlar soni  : {j['satrlar']}\n")

    with (katalog / "yaxlitlik_sinovlari.csv").open(
        "w", encoding="utf-8", newline=""
    ) as fayl:
        writer = csv.DictWriter(
            fayl, fieldnames=["sinov", "kutilgan", "haqiqiy", "mos", "izoh"]
        )
        writer.writeheader()
        writer.writerows(sinovlar)


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    BAZA_FAYLI.parent.mkdir(parents=True, exist_ok=True)

    try:
        with closing(ulanish_ochish(BAZA_FAYLI)) as ulanish:
            sxemani_yaratish(ulanish)
            sinovlar = yaxlitlikni_sinash(ulanish)
            sxema = sxema_malumotlari(ulanish)

        hisobotlarni_yozish(HISOBOT_KATALOGI, sxema, sinovlar)

    except sqlite3.Error as xatolik:
        print("Ma’lumotlar bazasi xatosi:", xatolik)
        return
    except OSError as xatolik:
        print("Fayl bilan ishlashda xatolik:", xatolik)
        return

    print("Jadvallar:")
    for j in sxema:
        print(f"  {j['jadval']:<22} ustunlar: {j['ustunlar']}, satrlar: {j['satrlar']}")

    print("\nYaxlitlik sinovlari:")
    for s in sinovlar:
        belgi = "✓" if s["mos"] == "ha" else "✗"
        print(f"  {belgi} {s['sinov']}: {s['haqiqiy']}")

    moslar = sum(1 for s in sinovlar if s["mos"] == "ha")
    print(f"\nKutilgan natijaga mos: {moslar} / {len(sinovlar)}")
    print("Hisobotlar katalogi:", HISOBOT_KATALOGI)


if __name__ == "__main__":
    main()
