# Offline Quran reading

Tarteel keeps a local copy of the Quran catalog and opened Surahs so a reader can continue when the network is unavailable.

## Cache behavior

- Fresh cached data is used immediately for the catalog and previously opened Surahs.
- Network requests refresh data after the 24-hour freshness window.
- If a refresh fails, the most recent cached copy is returned as a `stale-cache` result instead of failing the reader.
- The cache is stored in browser `localStorage` and is best-effort; private browsing or storage limits do not prevent normal online reading.
- `clearQuranCache()` clears all Tarteel Quran cache entries.

Audio remains network-dependent because recitation files are remote media and are not copied into the browser cache by this layer.

## Data integrity

The offline fallback only serves data that was previously obtained and validated from the Quran provider. It never fabricates Quran text or translations when no cached copy exists.
