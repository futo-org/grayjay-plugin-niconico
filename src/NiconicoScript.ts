//#region constants
import type {
    ChannelVideosResponse,
    CommentsResponse,
    Content,
    FeedResponse,
    HLSResponse,
    NiconicoCommentContext,
    NiconicoSource,
    PageDataResponse,
    PlaylistPageDataResponse,
    PlaylistResponse,
    SearchContent,
    SearchSuggestionsResponse,
    SearchVideosResponse,
    Settings,
    UserPageDataResponse,
    UserPlaylistsResponse,
    UserSubscriptionsResponse,
    VideoPageDataResponse
} from "./types"

const PLATFORM = "Niconico" as const

// Docs: https://site.nicovideo.jp/search-api-docs/snapshot
const URL_SEARCH = "https://api.search.nicovideo.jp/api/v2/snapshot/video/contents/search?targets=title,description,tags&fields=contentId,title,userId,viewCounter,lengthSeconds,thumbnailUrl,startTime&_sort=-viewCounter&_offset=0&_limit=20&_context=app-d39af5e3e5bb" as const
const URL_RECOMMENDED_FEED = "https://nvapi.nicovideo.jp/v1/recommend?recipeId=video_recommendation_recommend&sensitiveContents=mask&site=nicovideo&_frontendId=6&_frontendVersion=0" as const
const URL_COMMENTS = "https://nv-comment.nicovideo.jp/v1/threads" as const
const URL_FOLLOWING = "https://nvapi.nicovideo.jp/v1/users/me/following/users?pageSize=100" as const
const URL_PLAYLISTS = "https://nvapi.nicovideo.jp/v1/users/me/mylists" as const

const NICO_VIDEO_URL_REGEX = /.*nicovideo.jp\/watch\/(.*)/
const NICO_CHANNEL_URL_REGEX = /.*nicovideo.jp\/user\/(.*)/
const NICO_PLAYLIST_URL_REGEX = /.*nicovideo.jp\/my\/mylist\/(.*)/

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
function enable(conf: SourceConfig, settings: Settings, savedState?: string | null) {
    if (IS_TESTING) {
        log("IS_TESTING true")
        log("logging configuration")
        log(conf)
        log("logging settings")
        log(settings)
        log("logging savedState")
        log(savedState)
    }
}
//#endregion

function disable() {
    log("Niconico log: disabling")
}

//#region home
function getHome() {
    return new RecommendedVideoPager()
}
class RecommendedVideoPager extends VideoPager {
    constructor() {
        const res = local_http.GET(URL_RECOMMENDED_FEED, {}, bridge.isLoggedIn())

        if (res.code !== 200) {
            throw new ScriptException(`Failed request [${URL_RECOMMENDED_FEED}] (${res.code})`)
        }

        const response: FeedResponse = JSON.parse(res.body)

        const nicoVideos = response.data.items.map((x) => x.content)
        const platformVideos = nicoVideos.map(nicoVideoToPlatformVideo)

        super(platformVideos, false)
    }

    override nextPage(this: RecommendedVideoPager) {
        return this
    }
    override hasMorePagers(this: RecommendedVideoPager): boolean {
        return this.hasMore
    }
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

    const suggestions = response.candidates

    return suggestions
}

function getSearchCapabilities() {
    return { types: [Type.Feed.Mixed], sorts: [], filters: [] }
}

function search(query: string) {
    return new SearchVideoPager(query)
}
class SearchVideoPager extends VideoPager {
    constructor(query: string) {
        const res = local_http.POST(
            URL_SEARCH,
            `q=${encodeURIComponent(query)}`,
            {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            false
        )

        if (!res.isOk) {
            throw new ScriptException(`Failed request [${URL_SEARCH}] (${res.code})`)
        }

        const nicoVideos: SearchVideosResponse = JSON.parse(res.body)
        const platformVideos = nicoVideos.data.map(nicoSearchVideoToPlatformVideo)
        super(platformVideos, false)
    }
    override nextPage(this: SearchVideoPager) {
        return this
    }
    override hasMorePagers(this: SearchVideoPager): boolean {
        return this.hasMore
    }
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
        const platformVideos = nicoVideos.map(nicoVideoToPlatformVideo)
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
    const platformVideos = nicoPlaylist.items.map((x) => x.video).map(nicoVideoToPlatformVideo)

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
        datetime: dateToUnixSeconds(queryVideoXML("first_retrieve")),
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

function nicoSearchVideoToPlatformVideo(v: SearchContent) {
    const videoUrl = `https://www.nicovideo.jp/watch/${v.contentId}`
    const authorId = String(v.userId)

    return new PlatformVideo({
        id: new PlatformID(PLATFORM, v.contentId, plugin.config.id),
        name: v.title,
        thumbnails: new Thumbnails([new Thumbnail(v.thumbnailUrl, 0)]),
        duration: v.lengthSeconds,
        viewCount: v.viewCounter,
        url: videoUrl,
        isLive: false,
        datetime: dateToUnixSeconds(v.startTime),
        shareUrl: videoUrl,
        author: new PlatformAuthorLink(
            new PlatformID(PLATFORM, authorId, plugin.config.id),
            "ニコニコ",
            `https://www.nicovideo.jp/user/${authorId}`,
            "https://play-lh.googleusercontent.com/_C1KxgGIw43g2Y2G8salrswvYqkkBum5896cCrFOWkgdAxZI10efI-oQxfWRfLOBysE",
        ),
    })
}

function nicoVideoToPlatformVideo(v: Content) {
    const videoUrl = `https://www.nicovideo.jp/watch/${v.id}`
    const thumbnailUrl = v.thumbnail.listingUrl

    return new PlatformVideo({
        id: new PlatformID(PLATFORM, v.id, plugin.config.id),
        name: v.title,
        thumbnails: new Thumbnails([new Thumbnail(thumbnailUrl, 0)]),
        duration: v.duration,
        viewCount: v.count.view,
        url: videoUrl,
        isLive: false,
        datetime: dateToUnixSeconds(v.registeredAt),
        shareUrl: videoUrl,
        author: new PlatformAuthorLink(
            new PlatformID(PLATFORM, v.owner.id, plugin.config.id),
            v.owner.name,
            `https://www.nicovideo.jp/user/${v.owner.id}`,
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
function dateToUnixSeconds(date: string) {
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
//#endregion

console.log(milliseconds_to_WebVTT_timestamp)
// export statements are removed during build step
// used for unit testing in NiconicoScript.test.ts
export { milliseconds_to_WebVTT_timestamp }
