# Hemma i Tranemo – genomförandet

Vad som faktiskt byggdes när designmålet (`mal-hemma-i-tranemo.html`)
togs in i koden, oktober 2026, och var besluten bor. Läs det här innan
du rör utseendet; målsidan säger *vart*, det här säger *hur*.

## Var saker bor

| Vad | Fil |
| --- | --- |
| Material och årstider (CSS-variabler) | `imports/ui/utils/globalStylesManager.ts` |
| Årstid från datum, `?season=` som förhandsvisning | `imports/api/_utils/season.ts`, `serverRenderer.js`, `WrapperHybrid.tsx` |
| Header, hero, ortkort, stämplar, sidfot, 3D-ikoner, chips | `client/main.css` (sektioner märkta `=== … ===`) |
| Kärnkomponenter | `imports/ui/core/*` |
| Ortens färgvärld | `imports/ui/utils/locationPalette.ts` |
| Stämpel, orttag, 3D-ikon | `imports/ui/generic/Stamp.tsx`, `PlaceTag.tsx`, `ThreeDIcon.tsx` |
| Evenemangskort, anslagstavla, veckan | `imports/ui/listing/SexyThumb.tsx`, `RecurringOverview.tsx` |
| Startsidans välkomstband | `imports/ui/pages/locations/HomeHero.tsx` |

## Variabler

Temats nyans-skala (`--cocoso-colors-theme-50 … 900`) finns kvar och
räknas som förut från adminpanelens nyans/mättnad. Sajten står på
nyans 85/45 och accent 118/48, så att `theme-700` blir kommungrönt.
Utöver skalan finns fasta material i samma `:root`:

- `--cocoso-papper` öarna, `--cocoso-mylla` text, `--cocoso-mylla-soft`
  sekundär text, `--cocoso-linje` kanter
- `--cocoso-tegel` (+ `-600`, `-100`) varm accent för det som är nära i
  tid: etiketter i paneler, nålen på lappen, datumetikettens månad,
  dagens veckokort. `--cocoso-lingon` bara för fel och räknare.
- `--cocoso-skugga`, `--cocoso-skugga-kort`, `--cocoso-skugga-meny`
- `--cocoso-radius-kort` 12, `--cocoso-radius-falt` 10, `--cocoso-radius-meny` 14
- `--cocoso-font-display` Fraunces, `--cocoso-font-ui` Raleway. Brödtext
  följer temats `body.fontFamily`.

### Årstid

`getSeason(date)` ger `var | sommar | host | vinter` efter månad
(mars–maj, juni–augusti, september–november, december–februari).
Servern räknar per request och bakar in fyra variabler i `:root`;
klienten räknar om från sin egen klocka vid boot. `?season=vinter`
på vilken URL som helst visar en annan årstid, för granskning.
`data-season` ligger på wrappern och på `<html>`.

Variablerna: `--cocoso-season-golv` (sidans bakgrund via temats
`body.backgroundColor`), `--cocoso-season-glod-a/b` (hero), 
`--cocoso-season-tavla` (Idag-rutan), `--cocoso-season-accent`.
Klustret av 3D-ikoner i hero byts per årstid i `HomeHero.tsx`.

## Avsteg från målsidan, och varför

- **Brödtext stannar i Arial/Helvetica.** Målsidan antydde Raleway för
  mer, men de långa texterna läser bättre i en neutral grotesk och
  tranemo.se gör likadant.
- **Jordfärgerna i veckan är orörda.** De var redan rätt.
- **Kalenderns händelsefärger** (rosa, grönt, orange per plats) är kvar
  från react-big-calendar. Att ge dem orternas färgvärldar är nästa steg.
- **Orternas färgvärld bestäms av ordningen** admin gett orterna
  (`worldForIndex`), inte av ett fält. Vill ni välja färg per ort,
  lägg till `colorKey` på location och läs det i `locationPalette.ts`.
- **Antalet arrangörer** i hero räknas med `getOrganizerCount` på
  klienten efter hydrering, så serverns HTML saknar meningen. Det är
  avsiktligt för att slippa en mismatch.
- **Adminsidorna** är inte omgjorda. De använder kärnkomponenterna och
  ärver därför piller, fält och färger, men layouten är den gamla.
- **Mörkt läge** finns inte i appen; målsidans mörka palett gäller bara
  dokumentet.

## Regler att hålla

- Lägg innehåll på papper mot årstidens golv. Inga linjer för att skilja
  ytor åt.
- Kommungrönt (`theme-700`) för exakt en sak per vy: det som är valt.
- Alla knappar är piller (`Button`). `colorScheme="tegel"` för högst en
  handling per sida.
- Rubriker i Fraunces via `Heading` eller `var(--cocoso-font-display)`
  med `font-variation-settings: "SOFT" 60`, aldrig under 17 px.
- 3D-ikoner (`ThreeDIcon`) aldrig under 30 px, högst ett kluster per
  sida och en ikon per rubrik. Streckikoner i knappar och menyer.
- Rörelse: kort tonar in (`card-in`), hero-ikoner svävar, hover lyfter
  2–3 px. Allt stängs av vid `prefers-reduced-motion`.

## Att göra härnäst

1. Kalenderns händelsefärger från orternas färgvärldar.
2. Kategorichips för evenemang med 3D-ikoner (kräver kategorier på
   evenemang).
3. Adminpanelens layout i samma material.
4. Ett `colorKey`-fält på orter.
5. En adminknapp som låser årstid (idag bara `?season=`).
