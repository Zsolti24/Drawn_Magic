# Varázslós játék – Roadmap

Böngészős játék: a nagy képernyőn fut a játék, a telefon QR-kóddal csatlakozik és kontrollerként működik. A telefonra rajzolt jelekkel varázsolsz.

## Koncepció

- **Képernyő:** felülnézet, a varázsló középen áll, körben jönnek az ellenfelek, mindegyik fölött egy jel
- **Telefon:** rajzolsz a kijelzőre, a felismert jel minden azonos jelű ellenfelet eltalál
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
- A telefon csak eseményt küld (`{ t: "spell", id: "circle" }`), nem folyamatos adatot
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

- [ ] Rajzfelület a telefonon (pointer események, `touch-action: none`, görgetés tiltása)
- [ ] $1 recognizer, 3 jel: V, kör, cikkcakk
- [ ] Felismerési küszöb, hibás rajz jelzése
- [ ] Canvas játékciklus `requestAnimationFrame`-mel
- [ ] Varázsló középen, ellenfelek a szélről a közép felé, jel a fejük fölött
- [ ] Varázslat: minden azonos jelű ellenfél elpusztul
- [ ] Életek, pontszám, játék vége, újrakezdés
- [ ] Visszajelzések: találat, hiba, sebződés (képernyőn és telefonon)
- [ ] Wake Lock a telefonon

**Kész, ha:** 5 percig játszva is szórakoztató. Itt érdemes a legtöbbet finomítani.

## 2. fázis – Az első pálya

- [ ] Pálya leírása adatfájlban: hullámok, ellenfelek, időzítés
- [ ] Ellenféltípusok: alap, gyors, többjelű, nagy
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

- [ ] Főmenü: Pályák, Képességek, Felszerelés, Beállítások
- [ ] Pályatérkép: 1 játszható pálya, a többi helye zárolva
- [ ] Pálya indítása a menüből, visszatérés a végén
- [ ] Beállításokban: fiók nullázása, kilépés
- [ ] Döntés: a menü egérrel vagy telefonról irányítható

**Kész, ha:** a menüből indul a pálya, és a végén oda térsz vissza.

## 5. fázis – Képességek és tanulás

- [ ] Képességek adatként: ár, előfeltétel, hatás
- [ ] Képességfa felület, megnyitás tapasztalati pontból
- [ ] Új jelek tanulása
- [ ] Saját varázslatok töltődési idővel: pajzs, lassítás, robbanás
- [ ] Tanuló mód: új jel gyakorlása, amíg párszor sikerül
- [ ] Megnyitott képességek mentése a profilba

**Kész, ha:** a megtanult képesség megjelenik és működik a pályán.

## 6. fázis – Felszerelés

- [ ] Tárgyak adatként: hely, kinézet, buff
- [ ] Helyek: kalap, köpeny, pálca, amulett
- [ ] Felszerelés felület: felvétel, levétel, összehasonlítás
- [ ] Buffok alkalmazása a játékban (pl. +1 élet, gyorsabb töltődés, nagyobb kombószorzó)
- [ ] Kinézet megjelenítése a varázslón
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
