# Drawn Magic

Böngészős varázslós játék: a nagy képernyőn fut a játék, a telefon QR-kóddal csatlakozik és kontrollerként működik. A terv: [roadmap.md](roadmap.md).

## Indítás

```sh
npm install
npm run dev
```

- Képernyő: http://localhost:5173/
- Telefon: a képernyőn megjelenő QR-kód (`/c?room=XXXX`)

A `dev` egyszerre indítja a WebSocket szervert (`:3001`) és a Vite-ot (`:5173`). A Vite a `/ws` útvonalat továbbítja a szervernek, így kívülről elég egyetlen portot elérhetővé tenni.

## Teszt valódi telefonnal

A telefon nem éri el a `localhost`-ot, ezért tunnel kell:

```sh
winget install Cloudflare.cloudflared   # egyszer
npm run tunnel
```

A kiírt `https://….trycloudflare.com` címet nyisd meg a gépen is, és onnan olvasd be a QR-kódot (a QR-kód az aktuális címre mutat).

Ugyanazon a wifin a `Network` alatti címmel is működik, de akkor nincs HTTPS, ami később kell (Wake Lock, rezgés).

## Parancsok

| Parancs | Mit csinál |
| --- | --- |
| `npm run dev` | szerver és kliens fejlesztői módban |
| `npm run typecheck` | TypeScript ellenőrzés mindkét oldalon |
| `npm run build` | kliens éles build (`client/dist`) |
| `npm run tunnel` | cloudflared tunnel az 5173-as portra |

## Szerkezet

```
client/src/screen      nagy képernyő
client/src/controller  telefon
client/src/net         WebSocket kliens újracsatlakozással
server/index.ts        szobák, üzenetek továbbítása
shared/messages.ts     közös üzenettípusok
```
