# Quran reader architecture

The web client now provides a production-oriented Quran reading path:

- 114-surah catalog loaded from Al Quran Cloud.
- Uthmani Arabic text from the `quran-uthmani` edition.
- Saheeh International English translation from `en.sahih`.
- Mishary Rashid Alafasy ayah audio from `ar.alafasy`.
- Ayah-by-ayah previous/next navigation.
- Audio playback advances automatically to the next ayah.
- Search across surah number, English name, Arabic name, and translation title.
- Last-read surah/ayah and bookmarks are stored locally on the device.
- Successfully loaded surahs are cached for 24 hours, so repeat visits can continue without another text request.
- Quran requests have a 15-second timeout so a stalled provider cannot leave the reader loading indefinitely.
- When the audio edition does not return an ayah URL, Tarteel falls back to the documented Al Quran Cloud-compatible Islamic Network CDN path for Alafasy audio.
- Network/provider failures are surfaced as retryable errors instead of silently showing fabricated Quran content.

## Provider boundary

The client uses the keyless Al Quran Cloud REST API directly from `client/src/quranApi.js`. No API credential is required. The API is a remote dependency, so the UI treats it as unavailable when a request fails and uses the local cache when a cached copy is still valid.

Provider endpoints can be overridden at build time with `VITE_QURAN_API_URL`. The audio CDN and fallback bitrate can be overridden with `VITE_QURAN_AUDIO_CDN_URL` and `VITE_QURAN_AUDIO_BITRATE`. Defaults are the public Al Quran Cloud API, Islamic Network CDN, and 128 kbps respectively.

The provider documents the surah endpoint, audio editions, CDN, fair-use guidance, and attribution requirements:

- https://alquran.cloud/api
- https://alquran.cloud/api-clients
- https://alquran.cloud/cdn
- https://alquran.cloud/terms-and-conditions

## Attribution and licensing

Tarteel displays the source and edition names in the reader footer. Keep the edition identifiers intact when adding more translations or reciters. Before shipping commercial offline bundles or additional translations/recitations, review the current provider terms and the rights attached to the selected edition.

## Future backend migration

The frontend provider module is deliberately isolated. If the app later needs server-side rate limiting, centralized caching, analytics, or authenticated access to the Quran corpus, replace the `API_BASE` calls in `quranApi.js` with Tarteel API routes while keeping the returned normalized shape unchanged.
