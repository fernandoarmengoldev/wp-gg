<p align="center">
  <img src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android" />
  <img src="https://img.shields.io/badge/Kotlin-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white" alt="Kotlin" />
</p>

# WP.GG

WP.GG is a League of Legends project organized as a monorepo with two main parts:

- `server/`: a Bun + TypeScript REST API that integrates with Riot Games API and stores match data in MongoDB.
- `android/`: a native Android app written in Kotlin that consumes the backend and CommunityDragon data.

Most of the original work was done in 2021-2022. In 2026 the project was resumed, the backend was moved into `server/`, and the Android client was consolidated into the same repository.

## Repository Structure

```text
.
├── android/
│   ├── app/
│   ├── build.gradle
│   ├── gradle.properties
│   ├── gradlew
│   └── settings.gradle
├── server/
│   ├── docs/
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
└── README.md
```

## Backend

The backend provides the data layer for WP.GG:

- Fetches summoner, mastery, ranked, and match data from Riot Games API.
- Stores matches in MongoDB.
- Calculates champion analytics from stored matches.
- Exposes HTTP routes for the Android client.
- Can run a background random-match collector to keep growing the dataset.

### Main backend features

- Summoner profile lookup
- Match history retrieval
- Champion mastery and ranked data
- Champion win rate and pick rate
- Best and worst matchups
- Recommended boots, mythics, legendary items, spells, and runes
- Champion position detection

### Backend routes

Routes are currently defined in `server/src/routes.ts`:

- `GET /` - health check
- `GET /api/summoner/:gameName/:tagLine` - summoner profile and recent history
- `GET /api/maestry/:id` - champion mastery by summoner id
- `GET /api/elo/:id` - ranked data by summoner id
- `GET /api/match/:matchid` - full match detail
- `GET /api/matchesFromChamp/:champ` - aggregated champion statistics
- `GET /api/position` - stored champion positions
- `GET /api/positionSetting` - rebuild champion positions from match data

### Backend setup

Requirements:

- Bun 1.x
- MongoDB
- Riot Games API key

Install dependencies:

```bash
cd server
bun install
```

Create `server/.env`:

```env
DB_URL=mongodb://0.0.0.0:27017
RIOT_API_KEY=your_riot_api_key_here
GET_RANDOM_MATCHES=false
PORT=3000
RANDOM_MATCH_INTERVAL_MS=5000
```

Run the backend:

```bash
cd server
bun run dev
```

Other useful commands:

```bash
cd server
bun run start
bun run typecheck
```

By default the API listens on `http://localhost:3000`.

## Android App

The Android app is a native client built with Kotlin, classic Android Views, and ViewBinding.

### Main app sections

- `Summoner`: summoner search, recent searches, ranked info, mastery, and recent matches
- `Champions`: champion list, role filters, and detail pages
- `Wiki`: items, spells, runes, and external League universe pages

### Android features

- Local caching of recent summoner searches through `SharedPreferences`
- Champion statistics screen with matchup and build recommendations
- Champion information screen with abilities, role info, and videos
- Match detail screen with general stats and charts
- Static game data loading from CommunityDragon

### Android stack

- Kotlin
- Android SDK 32
- Retrofit + Gson
- Glide
- Kotlin Coroutines
- MPAndroidChart
- GraphView
- Material Components

### Android setup

Requirements:

- Android Studio
- Android SDK 32
- Emulator or Android device

Run the app:

1. Open `android/` in Android Studio.
2. Sync Gradle.
3. Run the `app` configuration on an emulator or device.

You can also build from the command line:

```bash
cd android
./gradlew assembleDebug
```

## Integration Notes

- The Android app contains a local emulator base URL at `http://10.0.2.2:3000/api/` in `android/app/src/main/java/com/fernandoarmengol/ggwp/network/RetrofitHelper.kt`.
- The same file also contains a legacy hosted backend URL.
- CommunityDragon is used by the app for champion, item, spell, rune, splash, and icon assets.
- The backend currently expects the summoner route format `:gameName/:tagLine`, so the Android client may need endpoint alignment if you want both modules running together with the latest server structure.

## Data Sources

- Riot Games API
- CommunityDragon
- MongoDB collections:
  - `matches`
  - `positions`

## License

This project is an educational fan application for League of Legends. League of Legends and related assets are property of Riot Games and must be used according to Riot's policies.
