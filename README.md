# Niconico Grayjay Plugin

## TO-DO

- handle region and premium block
- handle HD available with premium
- getting the livestream HLS manifest file requires a websocket connection
- playback tracker
- play historical live streams
- load user historical live streams and current livestream into creator feed
- test get subscriptions with page size equal to 5

## notes

there is a search api for videos. it doesn't match the website but might be useful for some things.
only updates once daily

```typescript
// docs: https://web.archive.org/web/20240302072321/https://site.nicovideo.jp/search-api-docs/snapshot
const URL_SEARCH = "https://snapshot.search.nicovideo.jp/api/v2/snapshot/video/contents/search" as const
```
