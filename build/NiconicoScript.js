const PLATFORM = "Niconico";
const URL_RECOMMENDED_FEED = "https://nvapi.nicovideo.jp/v1/recommend?recipeId=video_recommendation_recommend&sensitiveContents=mask&site=nicovideo&_frontendId=6&_frontendVersion=0";
const URL_FOLLOWING = "https://nvapi.nicovideo.jp/v1/users/me/following/users";
const URL_PLAYLISTS = "https://nvapi.nicovideo.jp/v1/users/me/mylists";
const USER_URL_PREFIX = "https://www.nicovideo.jp/user/";
const VIDEO_URL_PREFIX = "https://www.nicovideo.jp/watch/";
const LIVE_URL_PREFIX = "https://live.nicovideo.jp/watch/";
const LOGGED_IN_USER_LISTS_PREFIX = "https://www.nicovideo.jp/my/mylist/";
const SEARCH_PLAYLISTS_URL = "https://nvapi.nicovideo.jp/v1/search/list";
const NICO_VIDEO_URL_REGEX = /^https:\/\/(live|www)\.nicovideo\.jp\/watch\/(lv[0-9]{9}|sm[0-9]*?|so[0-9]{8}|)$/;
const NICO_CHANNEL_URL_REGEX = /^https:\/\/www\.nicovideo\.jp\/user\/([0-9]*?)$/;
const LOGGED_IN_USER_LISTS_REGEX = /^https:\/\/www\.nicovideo\.jp\/my\/(watchlater|mylist\/([0-9]{8}))$/;
const PLAYLIST_URL_REGEX = /^https:\/\/www\.nicovideo\.jp\/user\/([0-9]*?)\/(series|mylist)\/([0-9]*?)$/;
// determines what subtitles are available and likely other things
const ACCEPT_LANGUAGE = "en-US,en;q=0.7,es;q=0.3";
const HARDCODED_THUMBNAIL_QUALITY = 1080;
const MISSING_AUTHOR = "Missing Creator";
const DEFAULT_AUTHOR = 1;
const DEFAULT_AUTHOR_THUMB = "https://secure-dcdn.cdn.nimg.jp/nicoaccount/usericon/0/1.jpg?1671282761";
// set missing constants
Type.Order.Chronological = "Latest releases";
Type.Order.Views = "Most played";
Type.Order.Favorites = "Most favorited";
const local_dom_parser = domParser;
const local_http = http;
/** State */
let local_state;
//#endregion
//#region source methods
const local_source = {
    enable,
    disable,
    getHome,
    getShorts: getHome,
    getContentRecommendations,
    searchSuggestions,
    search,
    getSearchCapabilities,
    isContentDetailsUrl,
    getContentDetails,
    isChannelUrl,
    getChannel,
    getChannelCapabilities,
    getChannelContents,
    getChannelPlaylists,
    searchPlaylists,
    isPlaylistUrl,
    getPlaylist,
    getUserPlaylists,
    getUserSubscriptions,
};
init_source(local_source);
function init_source(local_source) {
    for (const method_key of Object.keys(local_source)) {
        // @ts-expect-error assign to readonly constant source object
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        source[method_key] = local_source[method_key];
    }
}
//#endregion
//#region enable
function enable(conf, settings, saved_state) {
    if (IS_TESTING) {
        log("IS_TESTING true");
        log("logging configuration");
        log(conf);
        log("logging settings");
        log(settings);
        log("logging savedState");
        log(saved_state);
    }
    if (saved_state !== null && saved_state !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const state = JSON.parse(saved_state);
        local_state = state;
    }
    else {
        const client_id = local_http.getDefaultClient(false).clientId;
        if (client_id === undefined) {
            throw new ScriptException("missing http client id");
        }
        local_state = {
            client_id
        };
    }
}
//#endregion
function disable() {
    log("Niconico log: disabling");
}
//#region home
function getHome() {
    const response = local_http.GET(URL_RECOMMENDED_FEED, {}, bridge.isLoggedIn());
    if (response.code !== 200) {
        throw new ScriptException(`Failed request [${URL_RECOMMENDED_FEED}] (${response.code.toString()})`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const feed_response = JSON.parse(response.body);
    const platform_videos = feed_response.data.items.flatMap((x) => {
        if (x.contentType === "video") {
            return nico_video_to_PlatformVideo(x.content);
        }
        return [];
    });
    return new VideoPager(platform_videos, false);
}
function getContentRecommendations(url) {
    console.log(`Niconico log: content recommendations not implemented for ${url}`);
    return new ContentPager([], false);
}
//#endregion
//#region search
function searchSuggestions(query) {
    const url = `https://sug.search.nicovideo.jp/suggestion/expand/${query}`;
    const res = local_http.GET(url, {}, false);
    if (!res.isOk) {
        throw new ScriptException(`Failed request [${url}] (${res.code.toString()})`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = JSON.parse(res.body);
    return response.candidates;
}
function getSearchCapabilities() {
    return new ResultCapabilities([Type.Feed.Videos, Type.Feed.Mixed], [Type.Order.Chronological, Type.Order.Favorites, Type.Order.Views], []);
}
function search(query, _type, order, filters) {
    if (filters === null || Object.keys(filters).length !== 0) {
        throw new ScriptException("unreachable");
    }
    if (order === "CHRONOLOGICAL" || order === null) {
        order = Type.Order.Chronological;
    }
    // lives videos are not playable so don't include them
    // case Type.Feed.Live:
    //     return new SearchLivePager(query, order)
    console.log(SearchLivePager);
    return new SearchVideoPager(query, order, 10);
}
class SearchVideoPager extends VideoPager {
    url;
    next_page;
    constructor(query, order, page_size) {
        const url = new URL("https://nvapi.nicovideo.jp/v1/search/video");
        url.searchParams.set("keyword", query);
        switch (order) {
            case Type.Order.Chronological:
                url.searchParams.set("sortKey", "registeredAt");
                break;
            case Type.Order.Views:
                url.searchParams.set("sortKey", "viewCount");
                break;
            case Type.Order.Favorites:
                url.searchParams.set("sortKey", "likeCount");
                break;
            default:
                log(`Niconico log: unexpected ordering ${order}`);
                url.searchParams.set("sortKey", "registeredAt");
                break;
        }
        url.searchParams.set("sortOrder", "desc");
        url.searchParams.set("page", "1");
        url.searchParams.set("pageSize", page_size.toString());
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const videos_response = JSON.parse(local_http.GET(url.toString(), { "X-Frontend-Id": "6", }, false).body);
        const platform_videos = videos_response.data.items.map(nico_video_to_PlatformVideo);
        super(platform_videos, videos_response.data.hasNext);
        this.url = url;
        this.next_page = 2;
    }
    nextPage() {
        this.url.searchParams.set("page", this.next_page.toString());
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const videos_response = JSON.parse(local_http.GET(this.url.toString(), { "X-Frontend-Id": "6", }, false).body);
        const platform_videos = videos_response.data.items.map(nico_video_to_PlatformVideo);
        this.hasMore = videos_response.data.hasNext;
        this.results = platform_videos;
        this.next_page = this.next_page + 1;
        return this;
    }
    hasMorePagers() {
        return this.hasMore;
    }
}
class SearchLivePager extends VideoPager {
    url;
    next_page;
    constructor(query, order) {
        const url = new URL("https://live.nicovideo.jp/search");
        url.searchParams.set("keyword", query);
        switch (order) {
            case Type.Order.Chronological:
                break;
            case Type.Order.Views:
                url.searchParams.set("sortOrder", "viewCountDesc");
                break;
            default:
                log(`Niconico log: unexpected ordering ${order}`);
                break;
        }
        url.searchParams.set("page", "1");
        const res = local_http.GET(url.toString(), {}, false);
        if (!res.isOk) {
            throw new ScriptException(`Failed request [${url.toString()}] (${res.code.toString()})`);
        }
        // using the DOM parser because the data is stored in an element attribute with annoying &quot;
        const data = local_dom_parser.parseFromString(res.body).getElementById("embedded-data")?.getAttribute("data-props");
        if (data === undefined) {
            throw new ScriptException("missing data");
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const obj = JSON.parse(data);
        const platform_videos = obj.searchResult.programs.onair.map(format_live_search_results);
        super(platform_videos, obj.searchResult.programs.onair.length !== 0);
        this.url = url;
        this.next_page = 2;
    }
    nextPage() {
        this.url.searchParams.set("page", this.next_page.toString());
        const res = local_http.GET(this.url.toString(), {}, false);
        if (!res.isOk) {
            throw new ScriptException(`Failed request [${this.url.toString()}] (${res.code.toString()})`);
        }
        // using the DOM parser because the data is stored in an element attribute with annoying &quot;
        const data = local_dom_parser.parseFromString(res.body).getElementById("embedded-data")?.getAttribute("data-props");
        if (data === undefined) {
            throw new ScriptException("missing data");
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const obj = JSON.parse(data);
        const platform_videos = obj.searchResult.programs.onair.map(format_live_search_results);
        this.hasMore = obj.searchResult.programs.onair.length !== 0;
        this.results = platform_videos;
        this.next_page = this.next_page + 1;
        return this;
    }
    hasMorePagers() {
        return this.hasMore;
    }
}
function format_live_search_results(live_broadcast) {
    const video_url = `${LIVE_URL_PREFIX}${live_broadcast.id}`;
    const author_id = live_broadcast.programProvider.id;
    return new PlatformVideo({
        id: new PlatformID(PLATFORM, live_broadcast.id, plugin.config.id),
        name: live_broadcast.title,
        thumbnails: new Thumbnails([new Thumbnail(live_broadcast.listingThumbnail, HARDCODED_THUMBNAIL_QUALITY)]),
        viewCount: live_broadcast.statistics.watchCount,
        url: video_url,
        isLive: true,
        datetime: live_broadcast.beginAt / 1000,
        shareUrl: video_url,
        author: new PlatformAuthorLink(new PlatformID(PLATFORM, author_id, plugin.config.id), live_broadcast.programProvider.name, `${USER_URL_PREFIX}${author_id}`, live_broadcast.programProvider.icon),
    });
}
//#endregion
//#region content
function getContentDetails(video_url) {
    const match_result = video_url.match(NICO_VIDEO_URL_REGEX);
    if (match_result?.[1] === undefined || match_result[2] === undefined) {
        throw new ScriptException("regex error");
    }
    const video_type = match_result[1];
    const video_id = match_result[2];
    switch (video_type) {
        case "www": {
            const res = local_http.GET(video_url, { "Accept-Language": ACCEPT_LANGUAGE }, false);
            const data = local_dom_parser.parseFromString(res.body).getElementsByName("server-response")[0]?.getAttribute("content");
            if (data === undefined) {
                throw new ScriptException("missing server response data");
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const video_response = JSON.parse(data);
            if (video_response.data.response.errorCode === "FORBIDDEN") {
                throw new UnavailableException("This content is region locked");
            }
            const audio_id = video_response.data.response.media.domand.audios.find(audio => audio.isAvailable)?.id;
            if (audio_id === undefined) {
                throw new ScriptException("missing audio track");
            }
            const outputs = video_response.data.response.media.domand.videos.filter((video) => video.isAvailable).map((video) => {
                return [video.id, audio_id];
            });
            const thread_id = video_response.data.response.comment.nvComment.params.targets.find((target) => target.fork === "main")?.id;
            const language = video_response.data.response.comment.nvComment.params.language;
            const [response, raw_thread_response] = local_http
                .batch()
                .POST(`https://nvapi.nicovideo.jp/v1/watch/${video_id}/access-rights/hls?actionTrackId=${video_response.data.response.client.watchTrackId}`, JSON.stringify({ outputs }), {
                "x-access-right-key": video_response.data.response.media.domand.accessRightKey,
                "x-request-with": "nicovideo",
                "x-frontend-id": "6"
            }, false).POST(`${video_response.data.response.comment.nvComment.server}/v1/threads`, JSON.stringify({
                params: { targets: [{ "id": thread_id, fork: "main" }], language },
                threadKey: video_response.data.response.comment.nvComment.threadKey,
                additionals: {}
            }), { "X-Frontend-Id": "6" }, false).execute();
            if (response === undefined || raw_thread_response === undefined) {
                throw new ScriptException("unreachable");
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const hls = JSON.parse(response.body);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const thread_response = JSON.parse(raw_thread_response.body);
            const subtitles = thread_response.data.threads[0]?.comments.filter((comment) => comment.commands.includes("shita"));
            if (subtitles === undefined) {
                log("missing subtitles");
                throw new ScriptException("missing subtitles");
            }
            subtitles.sort((a, b) => a.vposMs - b.vposMs);
            // on niconico subtitles are displayed for 3 seconds each
            const three_seconds = 3 * 1000;
            const convert = milliseconds_to_WebVTT_timestamp;
            let vtt_text = `WEBVTT ${language}\n`;
            vtt_text += "\n";
            for (const comment of subtitles) {
                const end = comment.vposMs + three_seconds;
                vtt_text += `${convert(comment.vposMs)} --> ${convert(end)}\n`;
                vtt_text += `${comment.body}\n`;
                vtt_text += "\n";
            }
            const video = video_response.data.response.video;
            return new PlatformVideoDetails({
                id: new PlatformID(PLATFORM, video_id, plugin.config.id),
                name: video.title,
                author: new PlatformAuthorLink(new PlatformID(PLATFORM, video_response.data.response.owner.id.toString(), plugin.config.id), video_response.data.response.owner.nickname, `${USER_URL_PREFIX}${video_response.data.response.owner.id.toString()}`, video_response.data.response.owner.iconUrl),
                url: video_url,
                thumbnails: new Thumbnails([new Thumbnail(video.thumbnail.ogp, HARDCODED_THUMBNAIL_QUALITY)]),
                duration: video.duration,
                viewCount: video.count.view,
                isLive: false,
                shareUrl: video_url,
                datetime: date_to_unix_seconds(video.registeredAt),
                description: video.description,
                video: new VideoSourceDescriptor([new HLSSource({
                        name: "Niconico HLS",
                        duration: video.duration,
                        url: hls.data.contentUrl,
                        requestModifier: {
                            options: {
                                applyCookieClient: local_state.client_id
                            }
                        }
                    })]),
                rating: new RatingLikes(video.count.like),
                subtitles: [{
                        name: language,
                        url: `${video_response.data.response.comment.nvComment.server}/v1/threads`,
                        format: "text/vtt",
                        getSubtitles: () => {
                            return vtt_text;
                        }
                    }],
                getContentRecommendations: () => {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const recommendations_response = JSON.parse(local_http.GET(`https://nvapi.nicovideo.jp/v1/recommend?recipeId=video_watch_recommendation&videoId=${video_id}&limit=25&site=nicovideo&_frontendId=6`, {}, false).body);
                    return new ContentPager(recommendations_response.data.items
                        .flatMap((item) => {
                        if (item.contentType === "video") {
                            return item.content;
                        }
                        return [];
                    })
                        .map(nico_video_to_PlatformVideo), false);
                }
            });
        }
        // Getting the livestream HLS manifest file requires a websocket connection
        case "live": {
            if (1 === parseInt("1")) {
                throw new ScriptException("Live streams are not supported");
            }
            return new PlatformVideoDetails({
                id: new PlatformID(PLATFORM, "ASdf", plugin.config.id),
                name: "string",
                author: new PlatformAuthorLink(new PlatformID(PLATFORM, "ASdf", plugin.config.id), "sdg", "aasdg", "asdfs", 11),
                url: video_url,
                thumbnails: new Thumbnails([new Thumbnail("asdf", HARDCODED_THUMBNAIL_QUALITY)]),
                duration: 11,
                viewCount: 11,
                isLive: false,
                shareUrl: "string",
                datetime: 11,
                description: "string",
                video: new VideoSourceDescriptor([]),
                live: new HLSSource({
                    name: "string",
                    duration: 11,
                    url: "https://liveedge201.dmc.nico/hlslive/ht2_nicolive/nicolive-production-pg59405434356296_a873804bbc943ec8b2245b443f0d88a7d3acf86a6fab1f7382252b003a918506/master.m3u8?ht2_nicolive=136934864.g85qz0ipl9_smoyep_gra2qp1hdk2j"
                }),
                rating: new RatingLikes(11),
                subtitles: [],
                getContentRecommendations: () => new ContentPager([], false)
            });
        }
        default:
            throw new ScriptException(`unexpected video type ${video_type}`);
    }
}
function isContentDetailsUrl(url) {
    return NICO_VIDEO_URL_REGEX.test(url);
}
//#endregion
//#region channel
function isChannelUrl(url) {
    return NICO_CHANNEL_URL_REGEX.test(url);
}
function getChannel(url) {
    const match_result = url.match(NICO_CHANNEL_URL_REGEX);
    if (match_result === null) {
        throw new ScriptException("regex error");
    }
    const user_id = match_result[1];
    if (user_id === undefined) {
        throw new ScriptException("regex error");
    }
    const res = local_http.GET(`https://www.nicovideo.jp/user/${user_id}/video`, {}, false);
    if (!res.isOk) {
        throw new ScriptException(`Failed request [${url}] (${res.code.toString()})`);
    }
    const user = get_data_from_html(res.body);
    const channel = {
        id: new PlatformID(PLATFORM, user_id, plugin.config.id),
        name: user.nickname,
        thumbnail: user.icons.large,
        subscribers: user.followerCount,
        description: user.decoratedDescriptionHtml,
        url
    };
    return user.coverImage === null
        ? new PlatformChannel(channel)
        : new PlatformChannel({ ...channel, banner: user.coverImage.ogpUrl });
}
function getChannelCapabilities() {
    return new ResultCapabilities([Type.Feed.Videos], [Type.Order.Chronological, Type.Order.Favorites, Type.Order.Views], []);
}
function getChannelContents(url, type, order, filters) {
    const match_result = url.match(NICO_CHANNEL_URL_REGEX);
    if (match_result?.[1] === undefined) {
        throw new ScriptException("regex error");
    }
    const user_id = match_result[1];
    if (filters !== null) {
        throw new ScriptException("unreachable");
    }
    const sort_key = (() => {
        switch (order) {
            case null:
                return "registeredAt";
            case "CHRONOLOGICAL":
                return "registeredAt";
            case Type.Order.Chronological:
                return "registeredAt";
            case Type.Order.Favorites:
                return "likeCount";
            case Type.Order.Views:
                return "viewCount";
            default:
                throw new ScriptException("unreachable");
        }
    })();
    if (type === null) {
        log("Niconico log: channel content type is null defaulting to Videos");
    }
    return new ChannelVideoPager(user_id, 100, sort_key);
}
class ChannelVideoPager extends VideoPager {
    page_size;
    next_page;
    url;
    constructor(user_id, page_size, sort_key) {
        const url = new URL(`https://nvapi.nicovideo.jp/v3/users/${user_id}/videos`);
        url.searchParams.set("sensitiveContents", "mask");
        url.searchParams.set("sortOrder", "desc");
        url.searchParams.set("pageSize", page_size.toString());
        url.searchParams.set("sortKey", sort_key);
        url.searchParams.set("page", "1");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const channel_videos_response = JSON.parse(local_http.GET(url.toString(), { "X-Frontend-Id": "6", }, false).body);
        const nicoVideos = channel_videos_response.data.items.map((x) => x.essential);
        const platform_videos = nicoVideos.map(nico_video_to_PlatformVideo);
        super(platform_videos, channel_videos_response.data.totalCount > page_size);
        this.page_size = page_size;
        this.url = url;
        this.next_page = 2;
    }
    nextPage() {
        this.url.searchParams.set("page", this.next_page.toString());
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const channel_videos_response = JSON.parse(local_http.GET(this.url.toString(), { "X-Frontend-Id": "6", }, false).body);
        const nicoVideos = channel_videos_response.data.items.map((x) => x.essential);
        const platform_videos = nicoVideos.map(nico_video_to_PlatformVideo);
        this.results = platform_videos;
        this.hasMore = channel_videos_response.data.totalCount > this.page_size * this.next_page;
        this.next_page = this.next_page + 1;
        return this;
    }
    hasMorePagers() {
        return this.hasMore;
    }
}
function getChannelPlaylists(url) {
    const match_result = url.match(NICO_CHANNEL_URL_REGEX);
    if (match_result?.[1] === undefined) {
        throw new ScriptException("regex error");
    }
    const user_id = match_result[1];
    // first load playlists then load series after that
    return new ChannelPlaylistsPager(user_id, 100);
}
class ChannelPlaylistsPager extends PlaylistPager {
    user_id;
    page_size;
    next_page;
    constructor(user_id, page_size) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const search_response = JSON.parse(local_http.GET(`https://nvapi.nicovideo.jp/v1/users/${user_id}/mylists`, { "X-Frontend-Id": "6" }, false).body);
        const first_page = 1;
        const url = new URL(`https://nvapi.nicovideo.jp/v1/users/${user_id}/series`);
        url.searchParams.set("page", first_page.toString());
        url.searchParams.set("pageSize", page_size.toString());
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const series_search_response = JSON.parse(local_http.GET(url.toString(), { "X-Frontend-Id": "6" }, false).body);
        super([
            ...search_response.data.mylists.map(format_channel_playlist),
            ...series_search_response.data.items.map(format_channel_series)
        ], series_search_response.data.totalCount > first_page * page_size);
        this.user_id = user_id;
        this.page_size = page_size;
        this.next_page = 2;
    }
    nextPage() {
        const url = new URL(`https://nvapi.nicovideo.jp/v1/users/${this.user_id}/series`);
        url.searchParams.set("page", this.next_page.toString());
        url.searchParams.set("pageSize", this.page_size.toString());
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const search_response = JSON.parse(local_http.GET(url.toString(), { "X-Frontend-Id": "6" }, false).body);
        this.results = search_response.data.items.map(format_channel_series);
        this.hasMore = search_response.data.totalCount > this.next_page * this.page_size;
        this.next_page = this.next_page + 1;
        return this;
    }
    hasMorePagers() {
        return this.hasMore;
    }
}
function format_channel_playlist(playlist) {
    return new PlatformPlaylist({
        id: new PlatformID(PLATFORM, playlist.id.toString(), plugin.config.id),
        name: playlist.name,
        author: new PlatformAuthorLink(new PlatformID(PLATFORM, playlist.owner.id, plugin.config.id), playlist.owner.name, `${USER_URL_PREFIX}${playlist.owner.id}`, playlist.owner.iconUrl),
        url: `https://www.nicovideo.jp/user/${playlist.owner.id}/mylist/${playlist.id.toString()}`,
        videoCount: playlist.itemsCount
    });
}
function format_channel_series(playlist) {
    return new PlatformPlaylist({
        id: new PlatformID(PLATFORM, playlist.id.toString(), plugin.config.id),
        name: playlist.title,
        author: new PlatformAuthorLink(new PlatformID(PLATFORM, playlist.owner.id, plugin.config.id), MISSING_AUTHOR, `${USER_URL_PREFIX}${playlist.owner.id}`),
        url: `https://www.nicovideo.jp/user/${playlist.owner.id}/series/${playlist.id.toString()}`,
        videoCount: playlist.itemsCount,
        thumbnail: playlist.thumbnailUrl,
        thumbnails: new Thumbnails([new Thumbnail(playlist.thumbnailUrl, HARDCODED_THUMBNAIL_QUALITY)])
    });
}
//#endregion
//#region playlists
function isPlaylistUrl(url) {
    return PLAYLIST_URL_REGEX.test(url) || LOGGED_IN_USER_LISTS_REGEX.test(url);
}
function getPlaylist(playlist_url) {
    const match_result = playlist_url.match(PLAYLIST_URL_REGEX);
    const page_size = 100;
    // it's a logged in user playlist
    if (match_result === null) {
        if (!bridge.isLoggedIn()) {
            throw new LoginRequiredException("Failed to retrieve playlist, not logged in");
        }
        const playlist_id = playlist_url.match(LOGGED_IN_USER_LISTS_REGEX)?.[2];
        // it's a watch later playlist
        if (playlist_id === undefined) {
            const url = `https://nvapi.nicovideo.jp/v1/users/me/watch-later?sortKey=addedAt&sortOrder=desc&pageSize=${page_size.toString()}&page=1`;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const response = JSON.parse(local_http.GET(url, { "X-Frontend-Id": "6", }, true).body);
            return new PlatformPlaylistDetails({
                id: new PlatformID(PLATFORM, "watch-later", plugin.config.id),
                name: "Watch Later",
                author: new PlatformAuthorLink(new PlatformID(PLATFORM, DEFAULT_AUTHOR.toString(), plugin.config.id), MISSING_AUTHOR, `${USER_URL_PREFIX}${DEFAULT_AUTHOR.toString()}`, DEFAULT_AUTHOR_THUMB),
                url: "https://www.nicovideo.jp/my/watchlater",
                videoCount: response.data.watchLater.totalCount,
                contents: new WatchLaterVideoPager(response.data.watchLater.items.map((item) => item.video), response.data.watchLater.hasNext, page_size)
            });
        }
        const url = `https://nvapi.nicovideo.jp/v1/users/me/mylists/${playlist_id}?pageSize=${page_size.toString()}&page=1`;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const response = JSON.parse(local_http.GET(url, { "X-Frontend-Id": "6", }, true).body);
        return new PlatformPlaylistDetails({
            id: new PlatformID(PLATFORM, playlist_id, plugin.config.id),
            name: response.data.mylist.name,
            author: new PlatformAuthorLink(new PlatformID(PLATFORM, response.data.mylist.owner.id, plugin.config.id), response.data.mylist.owner.name, `${USER_URL_PREFIX}${response.data.mylist.owner.id}`, response.data.mylist.owner.iconUrl),
            url: `https://www.nicovideo.jp/my/mylist/${playlist_id}`,
            videoCount: response.data.mylist.totalItemCount,
            contents: new LoggedInPlaylistVideoPager(response.data.mylist.items.map((item) => item.video), response.data.mylist.totalItemCount > page_size * 1, playlist_id, page_size)
        });
    }
    const user_id = match_result[1];
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const type = match_result[2];
    const playlist_id = match_result[3];
    if (user_id === undefined || playlist_id === undefined) {
        throw new ScriptException("unreachable");
    }
    switch (type) {
        case "mylist": {
            const url = `https://nvapi.nicovideo.jp/v2/mylists/${playlist_id}?pageSize=${page_size.toString()}&page=1&sensitiveContents=mask`;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const response = JSON.parse(local_http.GET(url, { "X-Frontend-Id": "6", }, false).body);
            return new PlatformPlaylistDetails({
                id: new PlatformID(PLATFORM, playlist_id, plugin.config.id),
                name: response.data.mylist.name,
                author: new PlatformAuthorLink(new PlatformID(PLATFORM, response.data.mylist.owner.id, plugin.config.id), response.data.mylist.owner.name, `${USER_URL_PREFIX}${response.data.mylist.owner.id}`, response.data.mylist.owner.iconUrl),
                url: `https://www.nicovideo.jp/user/${response.data.mylist.owner.id}/mylist/${playlist_id}`,
                videoCount: response.data.mylist.totalItemCount,
                contents: new PlaylistVideoPager(response.data.mylist.items.map((item) => item.video), response.data.mylist.totalItemCount > page_size * 1, playlist_id, page_size)
            });
        }
        case "series": {
            const url = `https://nvapi.nicovideo.jp/v2/series/${playlist_id}?page=1&sensitiveContents=mask&pageSize=${page_size.toString()}`;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const response = JSON.parse(local_http.GET(url, { "X-Frontend-Id": "6", }, false).body);
            return new PlatformPlaylistDetails({
                id: new PlatformID(PLATFORM, playlist_id, plugin.config.id),
                name: response.data.detail.title,
                author: new PlatformAuthorLink(new PlatformID(PLATFORM, response.data.detail.owner.user.id.toString(), plugin.config.id), response.data.detail.owner.user.nickname, `${USER_URL_PREFIX}${response.data.detail.owner.user.id.toString()}`, response.data.detail.owner.user.icons.large),
                url: `https://www.nicovideo.jp/user/${response.data.detail.owner.user.id.toString()}/series/${playlist_id}`,
                videoCount: response.data.totalCount,
                contents: new SeriesVideoPager(response.data.items.map((item) => item.video), response.data.totalCount > page_size * 1, playlist_id, page_size),
                thumbnails: new Thumbnails([new Thumbnail(response.data.detail.thumbnailUrl, HARDCODED_THUMBNAIL_QUALITY)]),
                datetime: date_to_unix_seconds(response.data.detail.createdAt),
                thumbnail: response.data.detail.thumbnailUrl
            });
        }
        default:
            throw assert_exhaustive(type, "unreachable");
    }
}
class WatchLaterVideoPager extends VideoPager {
    page_size;
    next_page;
    constructor(initial_videos, has_more, page_size) {
        super(initial_videos.map(nico_video_to_PlatformVideo), has_more);
        this.page_size = page_size;
        this.next_page = 2;
    }
    nextPage() {
        const url = `https://nvapi.nicovideo.jp/v1/users/me/watch-later?sortKey=addedAt&sortOrder=desc&pageSize=${this.page_size.toString()}&page=${this.next_page.toString()}`;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const response = JSON.parse(local_http.GET(url, { "X-Frontend-Id": "6", }, true).body);
        this.results = response.data.watchLater.items.map((item) => item.video).map(nico_video_to_PlatformVideo);
        this.hasMore = response.data.watchLater.hasNext;
        this.next_page = this.next_page + 1;
        return this;
    }
    hasMorePagers() {
        return this.hasMore;
    }
}
class LoggedInPlaylistVideoPager extends VideoPager {
    playlist_id;
    page_size;
    next_page;
    constructor(initial_videos, has_more, playlist_id, page_size) {
        super(initial_videos.map(nico_video_to_PlatformVideo), has_more);
        this.playlist_id = playlist_id;
        this.page_size = page_size;
        this.next_page = 2;
    }
    nextPage() {
        const url = `https://nvapi.nicovideo.jp/v2/users/me/mylists/${this.playlist_id}?pageSize=${this.page_size.toString()}&page=${this.next_page.toString()}`;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const response = JSON.parse(local_http.GET(url, { "X-Frontend-Id": "6", }, true).body);
        this.results = response.data.mylist.items.map((item) => item.video).map(nico_video_to_PlatformVideo);
        this.hasMore = response.data.mylist.totalItemCount > this.page_size * 1;
        this.next_page = this.next_page + 1;
        return this;
    }
    hasMorePagers() {
        return this.hasMore;
    }
}
class PlaylistVideoPager extends VideoPager {
    playlist_id;
    page_size;
    next_page;
    constructor(initial_videos, has_more, playlist_id, page_size) {
        super(initial_videos.map(nico_video_to_PlatformVideo), has_more);
        this.playlist_id = playlist_id;
        this.page_size = page_size;
        this.next_page = 2;
    }
    nextPage() {
        const url = `https://nvapi.nicovideo.jp/v2/mylists/${this.playlist_id}?pageSize=${this.page_size.toString()}&page=${this.next_page.toString()}&sensitiveContents=mask`;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const response = JSON.parse(local_http.GET(url, { "X-Frontend-Id": "6", }, false).body);
        this.results = response.data.mylist.items.map((item) => item.video).map(nico_video_to_PlatformVideo);
        this.hasMore = response.data.mylist.totalItemCount > this.page_size * 1;
        this.next_page = this.next_page + 1;
        return this;
    }
    hasMorePagers() {
        return this.hasMore;
    }
}
class SeriesVideoPager extends VideoPager {
    playlist_id;
    page_size;
    next_page;
    constructor(initial_videos, has_more, playlist_id, page_size) {
        super(initial_videos.map(nico_video_to_PlatformVideo), has_more);
        this.playlist_id = playlist_id;
        this.page_size = page_size;
        this.next_page = 2;
    }
    nextPage() {
        const url = `https://nvapi.nicovideo.jp/v2/series/${this.playlist_id}?pageSize=${this.page_size.toString()}&page=${this.next_page.toString()}&sensitiveContents=mask`;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const response = JSON.parse(local_http.GET(url, { "X-Frontend-Id": "6", }, false).body);
        this.results = response.data.items.map((item) => item.video).map(nico_video_to_PlatformVideo);
        this.hasMore = response.data.totalCount > this.page_size * 1;
        this.next_page = this.next_page + 1;
        return this;
    }
    hasMorePagers() {
        return this.hasMore;
    }
}
function searchPlaylists(query) {
    // TODO ideally we are able to surface search results for playlists and series
    log("Niconico log: showing results for playlists. there isn't a way to show results for series");
    return new NiconicoPlaylistPager(query, 10, "mylist");
}
class NiconicoPlaylistPager extends PlaylistPager {
    next_page;
    url;
    constructor(query, page_size, type) {
        const url = new URL(SEARCH_PLAYLISTS_URL);
        url.searchParams.set("_frontendId", "6");
        url.searchParams.set("keyword", query);
        url.searchParams.set("sortKey", "_hotTotalScore");
        url.searchParams.set("types", type);
        url.searchParams.set("pageSize", page_size.toString());
        url.searchParams.set("page", "1");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const search_response = JSON.parse(local_http.GET(url.toString(), {}, false).body);
        super(search_response.data.items.map(format_playlist), search_response.data.hasNext);
        this.next_page = 2;
        this.url = url;
    }
    nextPage() {
        this.url.searchParams.set("page", this.next_page.toString());
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const search_response = JSON.parse(local_http.GET(this.url.toString(), {}, false).body);
        this.results = search_response.data.items.map(format_playlist);
        this.hasMore = search_response.data.hasNext;
        this.next_page = this.next_page + 1;
        return this;
    }
    hasMorePagers() {
        return this.hasMore;
    }
}
function format_playlist(playlist) {
    return new PlatformPlaylist({
        id: new PlatformID(PLATFORM, playlist.id.toString(), plugin.config.id),
        name: playlist.title,
        thumbnails: new Thumbnails([new Thumbnail(playlist.thumbnailUrl, HARDCODED_THUMBNAIL_QUALITY)]),
        author: new PlatformAuthorLink(new PlatformID(PLATFORM, playlist.owner.id, plugin.config.id), playlist.owner.name, `${USER_URL_PREFIX}${playlist.owner.id}`, playlist.owner.iconUrl),
        url: `https://www.nicovideo.jp/user/${playlist.owner.id}/mylist/${playlist.id.toString()}`,
        videoCount: playlist.videoCount,
        thumbnail: playlist.thumbnailUrl,
    });
}
//#endregion
//#region other
function getUserPlaylists() {
    const res = local_http.GET(URL_PLAYLISTS, { "X-Frontend-Id": "6" }, true);
    if (!res.isOk) {
        throw new ScriptException(`Failed request [${URL_PLAYLISTS}] (${res.code.toString()})`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const user_playlists_response = JSON.parse(res.body);
    const playlistUrls = user_playlists_response.data.mylists.map((playlist) => `${LOGGED_IN_USER_LISTS_PREFIX}${playlist.id}`);
    return [...playlistUrls, "https://www.nicovideo.jp/my/watchlater"];
}
function getUserSubscriptions() {
    const url = new URL(URL_FOLLOWING);
    url.searchParams.set("pageSize", "100");
    const res = local_http.GET(url.toString(), { "X-Frontend-Id": "6", }, true);
    if (!res.isOk) {
        throw new ScriptException(`Failed request [${url.toString()}] (${res.code.toString()})`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const user_subscriptions_response = JSON.parse(res.body);
    const subscriptions = user_subscriptions_response.data.items.map((x) => {
        return `${USER_URL_PREFIX}${x.id}`;
    });
    let cursor = user_subscriptions_response.data.summary.cursor;
    let has_more = user_subscriptions_response.data.summary.hasNext;
    while (has_more) {
        url.searchParams.set("cursor", cursor);
        const res = local_http.GET(url.toString(), { "X-Frontend-Id": "6", }, true);
        if (!res.isOk) {
            throw new ScriptException(`Failed request [${url.toString()}] (${res.code.toString()})`);
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const user_subscriptions_response = JSON.parse(res.body);
        subscriptions.push(...user_subscriptions_response.data.items.map((x) => {
            return `${USER_URL_PREFIX}${x.id}`;
        }));
        cursor = user_subscriptions_response.data.summary.cursor;
        has_more = user_subscriptions_response.data.summary.hasNext;
    }
    return subscriptions;
}
//#endregion
//#region parsing
function nico_video_to_PlatformVideo(v) {
    const video_url = `${VIDEO_URL_PREFIX}${v.id}`;
    const thumbnail_url = v.thumbnail.listingUrl;
    return new PlatformVideo({
        id: new PlatformID(PLATFORM, v.id, plugin.config.id),
        name: v.title,
        thumbnails: new Thumbnails([new Thumbnail(thumbnail_url, HARDCODED_THUMBNAIL_QUALITY)]),
        duration: v.duration,
        viewCount: v.count.view,
        url: video_url,
        isLive: false,
        datetime: date_to_unix_seconds(v.registeredAt),
        shareUrl: video_url,
        author: new PlatformAuthorLink(new PlatformID(PLATFORM, v.owner.id, plugin.config.id), v.owner.name, `${USER_URL_PREFIX}${v.owner.id}`, v.owner.iconUrl),
    });
}
function get_data_from_html(html) {
    const json = local_dom_parser.parseFromString(html).getElementById("js-initial-userpage-data")?.getAttribute("data-initial-data");
    if (json === undefined) {
        throw new ScriptException("missing data");
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data = JSON.parse(json);
    const user = data.state.userDetails.userDetails.user;
    return user;
}
//#endregion
//#region utilities
/**
 * Convert a Date to a unix time stamp
 * @param date Date to convert
 * @returns Unix time stamp
 */
function date_to_unix_seconds(date) {
    if (!date) {
        throw new ScriptException("invalid date string");
    }
    return Math.round(Date.parse(date) / 1000);
}
/**
 * Converts seconds to the timestamp format used in WebVTT
 * @param seconds
 * @returns
 */
function milliseconds_to_WebVTT_timestamp(milliseconds) {
    return new Date(milliseconds).toISOString().substring(11, 23);
}
function assert_exhaustive(value, exception_message) {
    log(["TikTok log:", value]);
    if (exception_message !== undefined) {
        return new ScriptException(exception_message);
    }
    return;
}
//#endregion
console.log(milliseconds_to_WebVTT_timestamp);
// export statements are removed during build step
// used for unit testing in NiconicoScript.test.ts
// export { milliseconds_to_WebVTT_timestamp };
//# sourceMappingURL=NiconicoScript.js.map
