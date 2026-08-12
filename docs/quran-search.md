# Quran search

Tarteel exposes a dedicated `/search` experience for finding ayahs across the Quran.

- English queries use the Saheeh International edition by default (`en.sahih`).
- Arabic queries use `quran-simple-clean` by default.
- The edition selector can explicitly choose Saheeh International, Simple Clean, or Uthmani.
- Results are cached locally for six hours to reduce repeated API traffic and improve repeat searches.
- `Open in reader` stores the selected Surah/ayah in the existing reader state and returns to `/`.

The search integration uses the keyless Al Quran Cloud search endpoint. Its documented form is `/v1/search/{keyword}/{surah}/{edition-or-language}` and the app searches `all` Surahs. The provider documents a soft per-IP API rate limit, so the client intentionally searches only on form submission and caches results.

If the provider is unavailable, the search page reports the error without changing the reader's local state.
