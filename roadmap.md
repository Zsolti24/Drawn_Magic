# Varázslós játék – Roadmap

Böngészős játék: a nagy képernyőn fut a játék, a telefon QR-kóddal csatlakozik és kontrollerként működik. A mágust a gép billentyűzetén mozgatod, a telefonra rajzolt jelekkel varázsolsz.

## Koncepció

- **Képernyő:** felülnézet, zárt füves rét, ami nagyobb a képernyőnél; a kamera követi a mágust (WASD / nyilak), az ellenfelek a látott területen kívülről jönnek és üldözik
- **Telefon:** rajzolsz a kijelzőre, minden jel egy képesség (pl. V = tűzgolyó, cikkcakk = villám, kör = pajzs)
- **Célzás:** automatikus, a képesség dönti el (legközelebbi ellenfél, láncban ugrik, maga körül)
- **Mana:** közös készlet, lassan töltődik, minden képességnek ára van
- **Cél:** a pálya hullámainak túlélése, pontszám, fejlődés
- **Játékon kívül:** fiók, pályaválasztó, képességek, felszerelés

## Technika

| Rész | Eszköz |
| --- | --- |
| Kliens | React + Vite + TypeScript |
| Játék megjelenítés | HTML canvas egy React komponensben (a játékciklus refben fut, nem state-ben) |
| Menük | sima React komponensek |
| Útvonalak | React Router: `/` képernyő, `/c?room=XXXX` telefon |
| Szerver | Node + `ws` (WebSocket), szobák kezelése |
| Jelfelismerés | $1 recognizer |
| QR-kód | `qrcode.react` |
| Fiók és adatbázis | Supabase (Auth + Postgres) |
| Fejlesztés telefonnal | HTTPS tunnel (cloudflared vagy ngrok) |

### Mappaszerkezet

```
/client
  /src
    /screen      # nagy képernyő: játék, menük
    /controller  # telefon oldal: rajzfelület
    /game        # játéklogika, React-től független (ellenfelek, hullámok, ütközés)
    /data        # jelek, ellenfelek, pályák, tárgyak, képességek leírása
    /net         # WebSocket kliens, üzenettípusok
/server
  index.ts       # szobák, üzenetek továbbítása
/shared
  messages.ts    # közös üzenettípusok kliens és szerver között
```

### Alapelvek

- A játéklogika (`/game`) ne függjön a Reacttől: sima TypeScript, a komponens csak kirajzolja
- Ellenfelek, jelek, pályák, tárgyak, képességek adatként legyenek leírva, ne kódba égetve
- A telefon csak eseményt küld (`{ t: "spell", id: "circle" }`), nem folyamatos adatot; a mozgás a billentyűzetről jön
- A haladást a szerver menti, nem a kliens

---

## 0. fázis – Alap

- [x] Vite + React + TypeScript projekt, szerver mappa, közös típusok
- [x] WebSocket szerver: szoba létrehozása 4 karakteres kóddal, csatlakozás, üzenet továbbítása
- [x] Képernyő oldal: szoba kérése, QR-kód megjelenítése
- [x] Telefon oldal: szobakód kiolvasása az URL-ből, csatlakozás
- [x] Kapcsolat állapotának jelzése mindkét oldalon
- [x] Automatikus újracsatlakozás ugyanabba a szobába
- [x] Tunnel beállítása, teszt valódi telefonnal

**Kész, ha:** a telefonon megnyomott gomb megjelenik a képernyőn.

## 1. fázis – Játékmag

- [x] Rajzfelület a telefonon (pointer események, `touch-action: none`, görgetés tiltása)
- [x] $1 recognizer, 3 jel: V, kör, cikkcakk
- [x] Képességek adatként (`data/spells.ts`): tűzgolyó, villám, pajzs; mana
- [x] Felismerési küszöb, hibás rajz jelzése
- [x] Canvas játékciklus `requestAnimationFrame`-mel
- [x] Mágus WASD-vel mozog, ellenfelek a szélről jönnek és üldözik
- [x] Varázslat: a jelhez tartozó képesség automatikus célzással
- [x] Életek, pontszám, játék vége, újrakezdés
- [x] Visszajelzések: találat, hiba, sebződés (képernyőn és telefonon)
- [x] Wake Lock a telefonon

**Kész, ha:** 5 percig játszva is szórakoztató. Itt érdemes a legtöbbet finomítani.

## 2. fázis – Az első pálya

- [ ] Pálya leírása adatfájlban: hullámok, ellenfelek, időzítés
- [x] Ellenféltípus-rendszer adatként (élet, sebesség, méret, sebzés, csapat, viselkedés)
- [x] A rét 10 faja saját rajzzal és animációval (pitypang, katica, dongó, csiga, vakond, pöfeteg, béka, sün, varjú, bokorgólem)
- [ ] A többi 4 téma saját fajai
- [x] Szörnyek listája témánként a pályaválasztóban
- [ ] Kombó szorzó
- [ ] Főellenség a pálya végén
- [ ] Pálya teljesítése és elbukása, eredményképernyő
- [ ] Jutalom: arany és tapasztalati pont

**Kész, ha:** a pályának van eleje, vége és nehézségi íve.

## 3. fázis – Fiókok és mentés

- [ ] Supabase projekt, regisztráció és belépés a képernyő oldalon
- [ ] A telefon a QR-rel csatlakozik, ott nincs belépés
- [ ] Profil tábla: szint, tapasztalat, arany, megnyitott pályák, képességek, tárgyak, felvett felszerelés
- [ ] Profil betöltése belépéskor
- [ ] Mentés pálya végén a szerveren keresztül
- [ ] Fiók nullázása megerősítéssel: a profil visszaáll alapra, a fiók megmarad
- [ ] Kilépés

**Kész, ha:** kilépés és belépés után minden megvan, nullázás után semmi.

## 4. fázis – Főmenü és pályaválasztó

- [x] Főmenü: Pályák, Képességek, Öltözet (felszerelés), Beállítások
- [x] Pályaválasztó: 5 téma × 5 pálya (1-1 … 5-5), mind játszható
- [x] Témák saját tereppel és hangulattal: Virágos rét, Ködös erdő, Holdfényes mocsár, Kristálybarlang, Hamuvidék
- [ ] Témánkénti mechanikák (köd, víz, kristály, láva), ellenféltípusok és főellenségek (2. fázis)
- [x] Pálya indítása a menüből, visszatérés a végén (Esc: szünet, kilépés a menübe)
- [x] Beállításokban: mentés nullázása megerősítéssel (fiók és kilépés a 3. fázissal)
- [x] Döntés: egyelőre egérrel; a telefonos menüirányítás később

**Kész, ha:** a menüből indul a pálya, és a végén oda térsz vissza.

## 5. fázis – Képességek és tanulás

- [x] Képességek adatként: ár, hatás (előfeltétel még nincs)
- [x] Felszerelt varázslatok (3 hely) választása, a telefon csak ezeket fogadja el
- [ ] Képességfa felület, megnyitás tapasztalati pontból
- [ ] Új jelek tanulása
- [x] Új képességek manáért: tornádó, méregbomba, gyógyítás, fagyasztó nova, meteor
- [ ] Tanuló mód: új jel gyakorlása, amíg párszor sikerül (alapja: Gyakorló tisztás célbábukkal)
- [ ] Megnyitott képességek mentése a profilba

**Kész, ha:** a megtanult képesség megjelenik és működik a pályán.

## 6. fázis – Felszerelés

- [x] Tárgyak adatként: hely, kinézet, megszerzés módja (buff még nincs)
- [x] Helyek: kalap, köpeny, pálca, amulett (+ szabad megjelenés: bőr, szakáll)
- [x] Felszerelés felület: helyek ikonokkal, görgethető tárgylista, felpróbálás, felvétel, levétel; lezárt tárgyak lakattal
- [ ] Összehasonlítás (buffok, ha lesznek)
- [ ] Buffok alkalmazása a játékban (pl. +1 élet, gyorsabb manatöltődés, olcsóbb varázslat, nagyobb kombószorzó)
- [x] Kinézet megjelenítése a varázslón
- [ ] Szerzés: bolt aranyért, ritka tárgyak a főellenségtől

**Kész, ha:** a felvett tárgy látszik a varázslón és érezhetően változtat a játékon.

## 7. fázis – Csiszolás és élesítés

- [ ] Grafika, animációk, részecskék
- [ ] Hang és zene
- [ ] Egyensúlyozás: nehézség, árak, buffok
- [ ] Bevezető első indításkor
- [ ] Élesítés HTTPS-sel
- [ ] Tesztelés iOS-en és Androidon, több képernyőméreten

---

## Későbbi ötletek

- További pályák, új ellenfelek és főellenségek
- Párbaj mód ellenséges varázsló ellen
- Ranglista
- Lámpa és történet elemek (a telefon mint tárgy a világban)
- Többjátékos mód

## Ismert buktatók

- iOS Safarin nincs rezgés, a visszajelzés ne csak erre épüljön
- A telefon nem éri el a `localhost`-ot, fejlesztéshez tunnel kell
- Ha a telefon lezár, megszakad a kapcsolat: kell újracsatlakozás és szünet a játékban
- A React state ne tárolja a játék képkockánként változó adatait, mert lassú lesz
