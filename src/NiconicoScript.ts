//#region constants
import type {
    ChannelVideosResponse,
    CommentsResponse,
    Content,
    FeedResponse,
    FilterGroupIDs,
    HLSResponse,
    NiconicoCommentContext,
    NiconicoSource,
    OnAirData,
    PageDataResponse,
    PlaylistPageDataResponse,
    PlaylistResponse,
    SearchLiveVideosResponse,
    SearchSuggestionsResponse,
    SearchTypes,
    Settings,
    UserPageDataResponse,
    UserPlaylistsResponse,
    UserSubscriptionsResponse,
    VideoPageDataResponse
} from "./types"

const PLATFORM = "Niconico" as const

const URL_RECOMMENDED_FEED = "https://nvapi.nicovideo.jp/v1/recommend?recipeId=video_recommendation_recommend&sensitiveContents=mask&site=nicovideo&_frontendId=6&_frontendVersion=0" as const
const URL_COMMENTS = "https://nv-comment.nicovideo.jp/v1/threads" as const
const URL_FOLLOWING = "https://nvapi.nicovideo.jp/v1/users/me/following/users?pageSize=100" as const
const URL_PLAYLISTS = "https://nvapi.nicovideo.jp/v1/users/me/mylists" as const
const USER_URL_PREFIX = "https://www.nicovideo.jp/user/" as const
const VIDEO_URL_PREFIX = "https://www.nicovideo.jp/watch/" as const
const LIVE_URL_PREFIX = "https://live.nicovideo.jp/watch/" as const

const NICO_VIDEO_URL_REGEX = /.*nicovideo.jp\/watch\/(.*)/
const NICO_CHANNEL_URL_REGEX = /.*nicovideo.jp\/user\/(.*)/
const NICO_PLAYLIST_URL_REGEX = /.*nicovideo.jp\/my\/mylist\/(.*)/

const JST_OFFSET = "+09:00"

const HARDCODED_THUMBNAIL_QUALITY = 1080 as const
const MISSING_AUTHOR = "Missing Creator"
const DEFAULT_AUTHOR = 1
const DEFAULT_AUTHOR_THUMB = "https://secure-dcdn.cdn.nimg.jp/nicoaccount/usericon/0/1.jpg?1671282761"

// set missing constants
Type.Order.Chronological = "Latest releases"
Type.Order.Views = "Most played"
Type.Order.Favorites = "Most favorited"

const local_dom_parser = domParser
const local_http = http
//#endregion

//#region source methods
const local_source: NiconicoSource = {
    enable,
    disable,
    getHome,
    searchSuggestions,
    search,
    getSearchCapabilities,
    isContentDetailsUrl,
    getContentDetails,
    isChannelUrl,
    getChannel,
    getChannelContents,
    isPlaylistUrl,
    getPlaylist,
    getComments,
    getUserPlaylists,
    getUserSubscriptions,
}
init_source(local_source)
function init_source<
    T extends { readonly [key: string]: string },
    S extends string,
    ChannelTypes extends FeedType,
    SearchTypes extends FeedType,
    ChannelSearchTypes extends FeedType
>(local_source: Source<T, S, ChannelTypes, SearchTypes, ChannelSearchTypes, unknown>) {
    for (const method_key of Object.keys(local_source)) {
        // @ts-expect-error assign to readonly constant source object
        source[method_key] = local_source[method_key]
    }
}
//#endregion

//#region enable
function enable(conf: SourceConfig, settings: Settings, saved_state?: string | null) {
    if (IS_TESTING) {
        log("IS_TESTING true")
        log("logging configuration")
        log(conf)
        log("logging settings")
        log(settings)
        log("logging savedState")
        log(saved_state)
    }
}
//#endregion

function disable() {
    log("Niconico log: disabling")
}

//#region home
function getHome() {
    const response = local_http.GET(URL_RECOMMENDED_FEED, {}, bridge.isLoggedIn())
    if (response.code !== 200) {
        throw new ScriptException(`Failed request [${URL_RECOMMENDED_FEED}] (${response.code})`)
    }
    const feed_response: FeedResponse = JSON.parse(response.body)

    const platform_videos = feed_response.data.items.map((x) => nico_video_to_PlatformVideo(x.content))

    return new VideoPager(platform_videos, false)
}
//#endregion

//#region search
function searchSuggestions(query: string) {
    const url = `https://sug.search.nicovideo.jp/suggestion/expand/${query}`
    const res = local_http.GET(url, {}, false)

    if (!res.isOk) {
        throw new ScriptException(`Failed request [${url}] (${res.code})`)
    }

    const response: SearchSuggestionsResponse = JSON.parse(res.body)

    return response.candidates
}
function getSearchCapabilities() {
    return new ResultCapabilities<FilterGroupIDs, SearchTypes>(
        [Type.Feed.Videos, Type.Feed.Live],
        [Type.Order.Chronological, Type.Order.Favorites, Type.Order.Views],
        // these fiilters only apply to videos not live streams
        [new FilterGroup(
            "Date",
            [
                new FilterCapability("Last Hour", Type.Date.LastHour, "Last Hour"),
                new FilterCapability("Today", Type.Date.Today, "Today"),
                new FilterCapability("Last Week", Type.Date.LastWeek, "Last Week"),
                new FilterCapability("Last Month", Type.Date.LastMonth, "Last Month"),
            ],
            false,
            "DATE"
        ),
        new FilterGroup(
            "Duration",
            [
                new FilterCapability("Short", Type.Duration.Short, "Short"),
                new FilterCapability("Long", Type.Duration.Long, "Long")
            ],
            false,
            "DURATION"
        ),
        new FilterGroup(
            "Additional Content",
            [
                new FilterCapability("Live", "LIVE", "Live"),
                new FilterCapability("Videos", "VIDEOS", "Videos")
            ],
            false,
            "ADDITIONAL_CONTENT"
        )]
    )
}
function search(query: string, type: SearchTypes | null, order: Order | null, filters: FilterQuery<FilterGroupIDs> | null) {
    if (filters === null) {
        throw new ScriptException("unreachable")
    }
    if (order === "CHRONOLOGICAL") {
        order = Type.Order.Chronological
    }
    if (type === null) {
        type = (() => {
            switch (filters["ADDITIONAL_CONTENT"]?.[0]) {
                case "VIDEOS":
                    return Type.Feed.Videos
                case "LIVE":
                    return Type.Feed.Live
                case undefined:
                    log("Niconico log: search type is null defaulting to Videos")
                    return Type.Feed.Videos
                default:
                    throw new ScriptException("unreachable")
            }
        })()
    }

    switch (type) {
        case Type.Feed.Live:
            return new SearchLivePager(query, order)
        case Type.Feed.Videos:
            return new SearchVideoPager(query, order, filters)
        default:
            throw assert_exhaustive(type, "unreachable")
    }
}
class SearchVideoPager extends VideoPager {
    private readonly url: URL
    private next_page: number
    constructor(query: string, order: Order | null, filters: FilterQuery<FilterGroupIDs>) {
        const url = new URL(`https://www.nicovideo.jp/search/${query}`)

        switch (order) {
            case null:
                // "Most popular"
                url.searchParams.set("sort", "h")
                break
            case Type.Order.Chronological:
                url.searchParams.set("sort", "f")
                break
            case Type.Order.Views:
                url.searchParams.set("sort", "v")
                break
            case Type.Order.Favorites:
                url.searchParams.set("sort", "likeCount")
                break
            default:
                log(`Niconico log: unexpected ordering ${order}`)
                url.searchParams.set("sort", "h")
                break
        }

        // order descending
        url.searchParams.set("order", "d")

        switch (filters["DURATION"]?.[0]) {
            case Type.Duration.Short:
                url.searchParams.set("l_range", "1")
                break
            case Type.Duration.Long:
                url.searchParams.set("l_range", "2")
                break
            case undefined:
                break
            default:
                throw new ScriptException(`unknown date filter ${filters.DURATION[0]}`)
        }

        switch (filters["DATE"]?.[0]) {
            case Type.Date.LastHour:
                url.searchParams.set("f_range", "4")
                break
            case Type.Date.Today:
                url.searchParams.set("f_range", "1")
                break
            case Type.Date.LastWeek:
                url.searchParams.set("f_range", "2")
                break
            case Type.Date.LastMonth:
                url.searchParams.set("f_range", "3")
                break
            case undefined:
                break
            default:
                throw new ScriptException(`unknown duration filter ${filters.DATE[0]}`)
        }

        url.searchParams.set("page", "1")

        const res = local_http.GET(url.toString(), {}, false)

        if (!res.isOk) {
            throw new ScriptException(`Failed request [${url.toString()}] (${res.code})`)
        }

        const root_element = local_dom_parser.parseFromString(res.body).querySelector('[data-video-list]')
        if (root_element === undefined) {
            super([], false)
        } else {
            const platform_videos: PlatformVideo[] = root_element?.querySelectorAll('[data-video-item]').map(format_video_search_results)

            super(platform_videos, true)
        }

        this.url = url
        this.next_page = 2
    }
    override nextPage(this: SearchVideoPager) {
        this.url.searchParams.set("page", this.next_page.toString())

        const res = local_http.GET(this.url.toString(), {}, false)

        if (!res.isOk) {
            throw new ScriptException(`Failed request [${this.url.toString()}] (${res.code})`)
        }

        const root_element = local_dom_parser.parseFromString(res.body).querySelector('[data-video-list]')

        if (root_element === undefined) {
            this.hasMore = false
            this.results = []
            this.next_page = this.next_page + 1

            return this
        }

        const platform_videos: PlatformVideo[] = root_element?.querySelectorAll('[data-video-item]').map(format_video_search_results)

        this.hasMore = true
        this.results = platform_videos
        this.next_page = this.next_page + 1

        return this
    }
    override hasMorePagers(this: SearchVideoPager): boolean {
        return this.hasMore
    }
}
function format_video_search_results(root_element: DOMNode) {
    const extracted_data = {
        duration: root_element.getElementsByClassName("videoLength")?.[0]?.text,
        thumbnail: root_element.getElementsByClassName("thumb")?.[0]?.getAttribute("src"),
        id: root_element.getAttribute("data-video-id"),
        title: root_element.getElementsByClassName("itemTitle")?.[0]?.firstChild?.text,
        upload_date: root_element.getElementsByClassName("video_uploaded")?.[0]?.firstChild?.text,
        view_count: root_element.getElementsByClassName("count view")?.[0]?.firstChild?.text
    }

    if (extracted_data.id === undefined || extracted_data.title === undefined || extracted_data.thumbnail === undefined || extracted_data.upload_date === undefined || extracted_data.duration === undefined || extracted_data.view_count === undefined) {
        throw new ScriptException("missing data")
    }

    const video_url = `${VIDEO_URL_PREFIX}${extracted_data.id}`
    const author_id = DEFAULT_AUTHOR

    return new PlatformVideo({
        id: new PlatformID(PLATFORM, extracted_data.id, plugin.config.id),
        name: extracted_data.title,
        thumbnails: new Thumbnails([new Thumbnail(extracted_data.thumbnail, 0)]),
        duration: hhmmssToDuration(extracted_data.duration),
        viewCount: parseInt(extracted_data.view_count.split(",").join("")),
        url: video_url,
        isLive: false,
        // little hack to get the correct times
        datetime: date_to_unix_seconds(extracted_data.upload_date + JST_OFFSET),
        shareUrl: video_url,
        author: new PlatformAuthorLink(
            new PlatformID(PLATFORM, author_id.toString(), plugin.config.id),
            MISSING_AUTHOR,
            `${USER_URL_PREFIX}${author_id}`,
            DEFAULT_AUTHOR_THUMB,
        ),
    })
}
class SearchLivePager extends VideoPager {
    private readonly url: URL
    private next_page: number
    constructor(query: string, order: Order | null) {
        const url = new URL("https://live.nicovideo.jp/search")

        url.searchParams.set("keyword", query)

        switch (order) {
            case null:
                break
            case Type.Order.Chronological:
                break
            case Type.Order.Views:
                url.searchParams.set("sortOrder", "viewCountDesc")
                break
            default:
                log(`Niconico log: unexpected ordering ${order}`)
                break
        }

        url.searchParams.set("page", "1")

        const res = local_http.GET(url.toString(), {}, false)

        if (!res.isOk) {
            throw new ScriptException(`Failed request [${url.toString()}] (${res.code})`)
        }

        // using the DOM parser because the data is stored in an element attribute with annoying &quot;
        const data = local_dom_parser.parseFromString(res.body).getElementById("embedded-data")?.getAttribute("data-props")
        if (data === undefined) {
            throw new ScriptException("missing data")
        }

        const obj: SearchLiveVideosResponse = JSON.parse(data)

        const platform_videos = obj.searchResult.programs.onair.map(format_live_search_results)
        super(platform_videos, obj.searchResult.programs.onair.length !== 0)

        this.url = url
        this.next_page = 2
    }
    override nextPage(this: SearchLivePager) {
        this.url.searchParams.set("page", this.next_page.toString())

        const res = local_http.GET(this.url.toString(), {}, false)

        if (!res.isOk) {
            throw new ScriptException(`Failed request [${this.url.toString()}] (${res.code})`)
        }

        // using the DOM parser because the data is stored in an element attribute with annoying &quot;
        const data = local_dom_parser.parseFromString(res.body).getElementById("embedded-data")?.getAttribute("data-props")
        if (data === undefined) {
            throw new ScriptException("missing data")
        }

        const obj: SearchLiveVideosResponse = JSON.parse(data)

        const platform_videos = obj.searchResult.programs.onair.map(format_live_search_results)

        this.hasMore = obj.searchResult.programs.onair.length !== 0
        this.results = platform_videos
        this.next_page = this.next_page + 1

        return this
    }
    override hasMorePagers(this: SearchLivePager): boolean {
        return this.hasMore
    }
}
function format_live_search_results(live_broadcast: OnAirData): PlatformVideo {
    const video_url = `${LIVE_URL_PREFIX}${live_broadcast.id}`
    const author_id = live_broadcast.programProvider.id

    return new PlatformVideo({
        id: new PlatformID(PLATFORM, live_broadcast.id, plugin.config.id),
        name: live_broadcast.title,
        thumbnails: new Thumbnails([new Thumbnail(live_broadcast.listingThumbnail, HARDCODED_THUMBNAIL_QUALITY)]),
        viewCount: live_broadcast.statistics.watchCount,
        url: video_url,
        isLive: true,
        datetime: live_broadcast.beginAt / 1000,
        shareUrl: video_url,
        author: new PlatformAuthorLink(
            new PlatformID(PLATFORM, author_id, plugin.config.id),
            live_broadcast.programProvider.name,
            `${USER_URL_PREFIX}${author_id}`,
            live_broadcast.programProvider.icon,
        ),
    })
}
//#endregion

//#region content
function getContentDetails(videoUrl: string) {
    const videoId = getVideoIdFromUrl(videoUrl)
    // Docs: https://w.atwiki.jp/nicoapi/pages/16.html
    const getThumbInfoUrl = `https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`

    // For video details in XML format
    const [videoXMLRes, videoHTMLRes] = local_http.batch().GET(
        getThumbInfoUrl,
        {}, false
    ).GET(
        videoUrl,
        {}, false
    ).execute()

    if (videoXMLRes === undefined || videoHTMLRes === undefined) {
        throw new ScriptException("unreachable")
    }
    if (!videoXMLRes.isOk) {
        throw new ScriptException(`Failed request [${getThumbInfoUrl}] (${videoXMLRes.code})`)
    }
    if (!videoHTMLRes.isOk) {
        throw new ScriptException(`Failed request [${videoUrl}] (${videoHTMLRes.code})`)
    }

    const videoXML = videoXMLRes.body
    const videoHTML = videoHTMLRes.body

    // Video no longer available
    if (videoHTML.includes("お探しの動画は視聴できません")) {
        throw new ScriptException("The video you are looking for cannot be viewed.")
    }

    // Video not available in this region
    if (videoHTML.includes("この動画は投稿( アップロード )された地域と同じ地域からのみ視聴できます。")) {
        throw new ScriptException("This video can only be viewed from the same region where it was posted (uploaded).")
    }

    // The HLS endpoint needs to be fetched separately
    const { actionTrackId, accessRightKey } = getCSRFTokensFromVideoDetailHTML(videoHTML)

    const hlsEndpoint = fetchHLSEndpoint(videoId, actionTrackId, accessRightKey)
    //const hlsEndpoint = "http://sample.vodobox.net/skate_phantom_flex_4k/skate_phantom_flex_4k.m3u8"

    const platformVideo = nicoVideoDetailsToPlatformVideoDetails(videoXML, hlsEndpoint)

    return platformVideo
}

function isContentDetailsUrl(url: string) {
    return NICO_VIDEO_URL_REGEX.test(url)
}
//#endregion

//#region comments
function getComments(videoUrl: string): NiconicoCommentPager {
    const videoHTMLRes = local_http.GET(videoUrl, {}, false)

    if (!videoHTMLRes.isOk) {
        throw new ScriptException(`Failed request [${videoUrl}] (${videoHTMLRes.code})`)
    }

    // Need data embedded in video HTML to make comments request
    const regex_thing = /data-api-data="(.*?)"/.exec(videoHTMLRes.body)
    if (regex_thing === null) {
        throw new ScriptException("regex error")
    }
    const encodedPageData = regex_thing[1]
    if (encodedPageData === undefined) {
        throw new ScriptException("regex error")
    }
    const pageData: PageDataResponse = JSON.parse(encodedPageData.replace(/&quot;/g, `"`))

    const videoCommentsRes = local_http.POST(
        URL_COMMENTS,
        JSON.stringify({
            params: pageData.comment.nvComment.params,
            threadKey: pageData.comment.nvComment.threadKey,
            additionals: {},
        }),
        {
            "x-frontend-id": "6",
        },
        false
    )

    if (!videoCommentsRes.isOk) {
        throw new ScriptException(`Failed request [${URL_COMMENTS}] (${videoCommentsRes.code})`)
    }

    const comments_response: CommentsResponse = JSON.parse(videoCommentsRes.body)
    const temp = comments_response.nicoComments.data.threads.find((x) => x.fork === "main")
    if (temp === undefined) {
        throw new ScriptException("missing main comments")
    }
    const comments = temp.comments

    log(comments)

    /*
    const platform_comments = nicoComments.map((comment) => {
        return new Comment({
            contextUrl: videoUrl,
            author: new PlatformAuthorLink(
                new PlatformID(PLATFORM, comment.id, config.id, PLATFORM_CLAIMTYPE),
                "", // Does not exist on comments endpoint
                `https://www.nicovideo.jp/user/${comment.userId}`,
                "", // Does not exist on comments endpoint
            ),
            message: comment.body,
            rating: new RatingLikes(comment.score),
            date: dateToUnixSeconds(comment.postedAt),
            replyCount: 0, // Does not exist
        })
    })

    // Reverse comments for proper date order
    const reversed = platform_comments.toReversed()
    */

    return new NiconicoCommentPager()
}
class NiconicoCommentPager extends CommentPager<NiconicoCommentContext> {
    constructor() {
        super([], false)
    }
}
//#endregion

//#region channel
function isChannelUrl(url: string) {
    return NICO_CHANNEL_URL_REGEX.test(url)
}

function getChannel(url: string) {
    const res = local_http.GET(url, {}, false)

    if (!res.isOk) {
        throw new ScriptException(`Failed request [${url}] (${res.code})`)
    }

    const user = getUserDataFromHTML(res.body)
    log(user)
    return new PlatformChannel({
        id: new PlatformID(PLATFORM, "String(user.id)", plugin.config.id),
        name: "user.nickname",
        thumbnail: "user.icons?.large",
        banner: "user.coverImage?.smartphoneUrl",
        subscribers: 0,
        description: "unescapeHtmlEntities(user.strippedDescription)",
        url
    })
    // return new PlatformChannel({
    //     id: new PlatformID(PLATFORM, String(user.id), plugin.config.id),
    //     name: user.nickname,
    //     thumbnail: user.icons?.large,
    //     banner: user.coverImage?.smartphoneUrl,
    //     subscribers: user.followerCount || 0,
    //     description: unescapeHtmlEntities(user.strippedDescription),
    //     url
    // })
}

function getChannelContents(channel_url: string) {
    return new ChannelContentsPager(channel_url)
}
class ChannelContentsPager extends VideoPager {
    constructor(channel_url: string) {
        const userId = getUserIdFromURL(channel_url)
        const searchUrl = `https://nvapi.nicovideo.jp/v3/users/${userId}/videos?sortKey=registeredAt&sortOrder=desc&sensitiveContents=mask&pageSize=100&page=1`
        const res = local_http.GET(
            searchUrl,
            {
                "X-Frontend-Id": "6",
            },
            false
        )

        if (!res.isOk) {
            throw new ScriptException(`Failed request [${searchUrl}] (${res.code})`)
        }

        const channel_videos_response: ChannelVideosResponse = JSON.parse(res.body)

        const nicoVideos = channel_videos_response.data.items.map((x) => x.essential)
        const platformVideos = nicoVideos.map(nico_video_to_PlatformVideo)
        super(platformVideos, false)
    }
    override nextPage(this: ChannelContentsPager) {
        return this
    }
    override hasMorePagers(this: ChannelContentsPager): boolean {
        return this.hasMore
    }
}
//#endregion

//#region playlists
function isPlaylistUrl(url: string) {
    return NICO_PLAYLIST_URL_REGEX.test(url)
}

function getPlaylist(playlist_url: string): PlatformPlaylistDetails {
    const playlistId = getPlaylistIdFromURL(playlist_url)
    const playlistApiUrl = `https://nvapi.nicovideo.jp/v1/users/me/mylists/${playlistId}?pageSize=100&page=1`

    // TODO load more than just user playlists
    if (!bridge.isLoggedIn()) {
        throw new LoginRequiredException("Failed to retrieve playlist, not logged in")
    }

    const [playlistHttpRes, playlistApiRes] = local_http
        .batch()
        .GET(
            playlist_url,
            { "X-Frontend-Id": "6" },
            true
        )
        .GET(
            playlistApiUrl,
            { "X-Frontend-Id": "6" },
            true,
        )
        .execute()

    if (playlistHttpRes === undefined || playlistApiRes === undefined) {
        throw new ScriptException("unreachable")
    }

    if (!playlistHttpRes.isOk) {
        throw new ScriptException(`Failed request [${playlist_url}] (${playlistHttpRes.code})`)
    }

    if (!playlistApiRes.isOk) {
        throw new ScriptException(`Failed request [${playlistApiUrl}] (${playlistApiRes.code})`)
    }

    const playlist_response: PlaylistResponse = JSON.parse(playlistApiRes.body)

    const nicoPlaylist = playlist_response.data.mylist
    const platformVideos = nicoPlaylist.items.map((x) => x.video).map(nico_video_to_PlatformVideo)

    // Get user from embedded HTML
    const regex_thing = /data-common-header="(.*?)"/.exec(playlistHttpRes.body)
    if (regex_thing === null) {
        throw new ScriptException("regex error")
    }
    const encodedPageData = regex_thing[1]
    if (encodedPageData === undefined) {
        throw new ScriptException("regex error")
    }
    const pageData: PlaylistPageDataResponse = JSON.parse(encodedPageData.replace(/&quot;/g, '"'))
    const user = pageData.initConfig.user

    log(platformVideos)
    log(user)

    throw new ScriptException("TODO")

    /*
    return new PlatformPlaylistDetails({
        url: playlist_url,
        id: new PlatformID(PLATFORM, playlistId, config.id, PLATFORM_CLAIMTYPE),
        author: new PlatformAuthorLink(
            new PlatformID(PLATFORM, String(user.id), config.id, PLATFORM_CLAIMTYPE),
            user.nickname,
            `https://www.nicovideo.jp/user/${user.id}`,
            user.iconUrl,
        ),
        name: nicoPlaylist.name,
        thumbnail: null,
        videoCount: platformVideos.length,
        contents: new VideoPager(platformVideos, false),
    })
    */
}
//#endregion

//#region other
function getUserPlaylists() {
    if (!bridge.isLoggedIn()) {
        throw new LoginRequiredException("Failed to retrieve playlists, not logged in")
    }

    const res = local_http.GET(URL_PLAYLISTS, { "X-Frontend-Id": "6" }, true)

    if (!res.isOk) {
        throw new ScriptException(`Failed request [${URL_PLAYLISTS}] (${res.code})`)
    }

    const user_playlists_response: UserPlaylistsResponse = JSON.parse(res.body)

    const playlistUrls = user_playlists_response.data.mylists.map(
        (playlist) => `https://www.nicovideo.jp/my/mylist/${playlist.id}`,
    )

    return playlistUrls
}

function getUserSubscriptions() {
    if (!bridge.isLoggedIn()) {
        throw new LoginRequiredException("Failed to retrieve subscriptions, not logged in")
    }

    const res = local_http.GET(
        URL_FOLLOWING,
        {
            "X-Frontend-Id": "6",
        },
        true,
    )

    if (!res.isOk) {
        throw new ScriptException(`Failed request [${URL_FOLLOWING}] (${res.code})`)
    }

    const user_subscriptions_response: UserSubscriptionsResponse = JSON.parse(res.body)

    const followingUrls = user_subscriptions_response.data.items.map((x) => {
        return `https://www.nicovideo.jp/user/${x.id}`
    })

    return followingUrls
}
//#endregion

//#region parsing
function nicoVideoDetailsToPlatformVideoDetails(videoXML: string, hlsEndpoint: string) {
    // Helper function
    const queryVideoXML = (tag: "video_id" | "thumbnail_url" | "watch_url" | "user_id" | "length" | "mylist_counter" | "title" | "first_retrieve" | "user_nickname" | "user_icon_url" | "description") => querySelectorXML(videoXML, tag)

    const videoId = queryVideoXML("video_id")
    const thumbnailUrl = queryVideoXML("thumbnail_url")
    const duration = hhmmssToDuration(queryVideoXML("length"))
    const videoUrl = queryVideoXML("watch_url")
    const authorId = queryVideoXML("user_id")

    // Closest thing to likes
    const mylistBookmarks = Number(queryVideoXML("mylist_counter"))

    log("creating HLS source")

    // Create HLS endpoint
    const hlsSource = new HLSSource({
        name: "Original",
        url: hlsEndpoint,
        duration,
    })

    log("adding requestModifier")

    // Domand videos require a domand_bid cookie for the request to work
    // const httpClientId = local_http.getDefaultClient(false).clientId
    // if (hlsEndpoint.includes("delivery.domand.nicovideo.jp") && httpClientId) {
    //     hlsSource.requestModifier = { options: { applyCookieClient: httpClientId } }
    // } else {
    //     throw new ScriptException(`Unhandled hlsEndpoint: ${hlsEndpoint}`)
    // }

    log("creating PlatformVideoDetails")

    return new PlatformVideoDetails({
        id: new PlatformID(PLATFORM, videoId, plugin.config.id),
        name: queryVideoXML("title"),
        thumbnails: new Thumbnails([new Thumbnail(thumbnailUrl, 0)]),
        duration,
        viewCount: 0,//Number(queryVideoXML("view_counter")),
        url: videoUrl,
        isLive: false,
        datetime: date_to_unix_seconds(queryVideoXML("first_retrieve")),
        shareUrl: videoUrl,
        author: new PlatformAuthorLink(
            new PlatformID(PLATFORM, authorId, plugin.config.id),
            queryVideoXML("user_nickname"),
            `https://www.nicovideo.jp/user/${authorId}`,
            queryVideoXML("user_icon_url"),
        ),
        description: unescapeHtmlEntities(queryVideoXML("description")),
        rating: new RatingLikes(mylistBookmarks),
        subtitles: [],
        video: new VideoSourceDescriptor([hlsSource]),
    })
}

// function nico_search_video_to_PlatformVideo(v: SearchContent) {
//     const video_url = `https://www.nicovideo.jp/watch/${v.contentId}`
//     const author_id = String(v.userId)

//     return new PlatformVideo({
//         id: new PlatformID(PLATFORM, v.contentId, plugin.config.id),
//         name: v.title,
//         thumbnails: new Thumbnails([new Thumbnail(v.thumbnailUrl, 0)]),
//         duration: v.lengthSeconds,
//         viewCount: v.viewCounter,
//         url: video_url,
//         isLive: false,
//         datetime: date_to_unix_seconds(v.startTime),
//         shareUrl: video_url,
//         author: new PlatformAuthorLink(
//             new PlatformID(PLATFORM, author_id, plugin.config.id),
//             "ニコニコ",
//             `https://www.nicovideo.jp/user/${author_id}`,
//             "https://play-lh.googleusercontent.com/_C1KxgGIw43g2Y2G8salrswvYqkkBum5896cCrFOWkgdAxZI10efI-oQxfWRfLOBysE",
//         ),
//     })
// }

function nico_video_to_PlatformVideo(v: Content) {
    const video_url = `${VIDEO_URL_PREFIX}${v.id}`
    const thumbnail_url = v.thumbnail.listingUrl

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
        author: new PlatformAuthorLink(
            new PlatformID(PLATFORM, v.owner.id, plugin.config.id),
            v.owner.name,
            `${USER_URL_PREFIX}${v.owner.id}`,
            v.owner.iconUrl,
        ),
    })
}

function getUserDataFromHTML(html: string) {
    const regex_thing = /data-initial-data="(.*?)"/.exec(html)
    if (regex_thing === null) {
        throw new ScriptException("regex error")
    }
    const encodedPageData = regex_thing[1]
    if (encodedPageData === undefined) {
        throw new ScriptException("regex error")
    }
    const userPageData: UserPageDataResponse = JSON.parse(encodedPageData.replace(/&quot;/g, '"'))
    const userObj = userPageData.state.userDetails.userDetails.user
    return userObj
}

function getCSRFTokensFromVideoDetailHTML(html: string) {
    const regex_thing = /data-api-data="(.*?)"/.exec(html)
    if (regex_thing === null) {
        throw new ScriptException("regex error")
    }
    const encodedPageData = regex_thing[1]
    if (encodedPageData === undefined) {
        throw new ScriptException("regex error")
    }
    const pageData: VideoPageDataResponse = JSON.parse(encodedPageData.replace(/&quot;/g, '"'))

    // For getting actionTrackId and X-Access-Right-Key from the DOM, required for HLS requests
    const actionTrackId = pageData.client.watchTrackId
    const accessRightKey = pageData.media.domand.accessRightKey

    if (!actionTrackId || !accessRightKey) {
        throw new ScriptException(`Unable to play video, could not get CSRF tokens.`)
    }

    return { actionTrackId, accessRightKey }
}

function fetchHLSEndpoint(videoId: unknown, actionTrackId: string, accessRightKey: string) {
    const url = `https://nvapi.nicovideo.jp/v1/watch/${videoId}/access-rights/hls?actionTrackId=${actionTrackId}`

    // This gives us the video/audio configurations we are allowed to request
    const jwt = parseJWT(accessRightKey)
    const videoOptions = jwt.v
    const audioOptions = jwt.a

    const res = local_http.POST(
        url,
        JSON.stringify({
            outputs: videoOptions.map((option) => [option, audioOptions[0]]),
        }),
        {
            "X-Access-Right-Key": accessRightKey,
            "X-Frontend-Id": "6",
            "X-Frontend-Version": "0",
            "X-Request-With": "https://www.nicovideo.jp",
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "*/*",
        },
        false
    )

    if (!res.isOk) {
        throw new ScriptException(`Failed request [${url}] (${res.code})`)
    }

    const hls_response: HLSResponse = JSON.parse(res.body)

    const hlsEndpoint = hls_response.data.contentUrl

    // Every part of the request was validated, not sure why we're getting a 400
    if (!hlsEndpoint) {
        throw new ScriptException(`Failed request [${url}] (${res.code})`)
    }

    return hlsEndpoint
}
//#endregion

//#region utilities
/**
 * Convert a Date to a unix time stamp
 * @param date Date to convert
 * @returns Unix time stamp
 */
function date_to_unix_seconds(date: string) {
    if (!date) {
        throw new ScriptException("invalid date string")
    }

    return Math.round(Date.parse(date) / 1000)
}

/**
 * Gets the video id from an URL
 * @param url The URL
 * @returns The video id
 */
function getVideoIdFromUrl(url: string) {
    if (!url) {
        return null
    }

    const match = NICO_VIDEO_URL_REGEX.exec(url)
    return match ? match[1] : null
}

/**
 * Gets the user id from an URL
 * @param url The URL
 * @returns The user id
 */
function getUserIdFromURL(url: string) {
    if (!url) {
        return null
    }

    const match = NICO_CHANNEL_URL_REGEX.exec(url)
    return match ? match[1] : null
}

/**
 * Gets the playlist id from an URL
 * @param url The URL
 * @returns The playlist id
 */
function getPlaylistIdFromURL(url: string) {
    if (!url) {
        return null
    }

    const match = NICO_PLAYLIST_URL_REGEX.exec(url)
    return match ? match[1] : null
}

/**
 * Unescape common HTML entities without using DOMParser
 * @param htmlString
 * @returns Unescaped string
 */
function unescapeHtmlEntities(htmlString: string) {
    return htmlString
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
}

/**
 * Format a duration string to a duration in seconds
 * @param durationStr Duration string format (hh:mm:ss)
 * @returns Duration in seconds
 */
function hhmmssToDuration(durationStr: string): number {
    if (!durationStr) {
        throw new ScriptException("invalid string")
    }

    const parts = durationStr.split(":").map(Number)

    if (parts.some(isNaN)) {
        throw new ScriptException("invalid string")
    }

    if (parts.length == 3) {
        if (parts[0] === undefined || parts[1] === undefined || parts[2] === undefined) {
            throw new ScriptException("unreachable")
        }
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    } else if (parts[1] !== undefined && parts[0] !== undefined) {
        return parts[0] * 60 + parts[1]
    } else if (parts.length == 1 && parts[0] !== undefined) {
        return parts[0]
    }

    throw new ScriptException("invalid string")
}

/**
 * Get text inside an XML tag
 * @param xml XML document string
 * @param tag XML tag to search for
 * @returns Text inside XML tag
 */
function querySelectorXML(xml: string, tag: string) {
    const xmlRegex = new RegExp(`<${tag}>(.*?)</${tag}>`, "g")
    const innerText = xmlRegex.exec(xml)
    if (innerText === null) {
        throw new ScriptException("missing text")
    }
    const text = innerText[1]
    if (text === undefined) {
        throw new ScriptException("missing text")
    }
    return text
}

/**
 * Parse Base64 encoded JWT
 * @param jwt Base64 encoded JWT
 * @returns Decoded JWT JSON
 */
function parseJWT(jwt: string): { readonly v: unknown[], readonly a: unknown[] } {
    const temp = jwt.split(".")[1]
    if (temp === undefined) {
        throw new ScriptException("bad jwt")
    }
    return JSON.parse(base64ToAscii(temp))
}

/**
 * Base64 to ASCII (from ChatGPT)
 * @param base64String Base64 encoded string
 * @returns ASCII string
 */
function base64ToAscii(base64String: string) {
    const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="

    let decoded = ""
    let buffer = 0
    let bufferLength = 0

    for (let i = 0; i < base64String.length; i++) {
        const charIndex = base64Chars.indexOf(base64String.charAt(i))

        if (charIndex === -1) {
            // Skip invalid characters
            continue
        }

        buffer = (buffer << 6) | charIndex
        bufferLength += 6

        if (bufferLength >= 8) {
            bufferLength -= 8
            const charCode = (buffer >> bufferLength) & 0xff
            decoded += String.fromCharCode(charCode)
        }
    }

    return decoded
}

/**
 * Converts seconds to the timestamp format used in WebVTT
 * @param seconds 
 * @returns 
 */
function milliseconds_to_WebVTT_timestamp(milliseconds: number) {
    return new Date(milliseconds).toISOString().substring(11, 23)
}
function assert_exhaustive(value: never): void
function assert_exhaustive(value: never, exception_message: string): ScriptException
function assert_exhaustive(value: never, exception_message?: string): ScriptException | undefined {
    log(["TikTok log:", value])
    if (exception_message !== undefined) {
        return new ScriptException(exception_message)
    }
    return
}
//#endregion

console.log(milliseconds_to_WebVTT_timestamp)
// export statements are removed during build step
// used for unit testing in NiconicoScript.test.ts
export { milliseconds_to_WebVTT_timestamp }
