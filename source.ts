const IS_TESTING = false

declare const bridge: {
  log(value: any)
  isLoggedIn()
}

const Type = {
  Source: {
    Dash: 'DASH',
    HLS: 'HLS',
    STATIC: 'Static',
  },
  Feed: {
    Videos: 'VIDEOS',
    Streams: 'STREAMS',
    Mixed: 'MIXED',
    Live: 'LIVE',
    Subscriptions: 'SUBSCRIPTIONS',
  },
  Order: {
    Chronological: 'CHRONOLOGICAL',
  },
  Date: {
    LastHour: 'LAST_HOUR',
    Today: 'TODAY',
    LastWeek: 'LAST_WEEK',
    LastMonth: 'LAST_MONTH',
    LastYear: 'LAST_YEAR',
  },
  Duration: {
    Short: 'SHORT',
    Medium: 'MEDIUM',
    Long: 'LONG',
  },
  Text: {
    RAW: 0,
    HTML: 1,
    MARKUP: 2,
  },
  Chapter: {
    NORMAL: 0,

    SKIPPABLE: 5,
    SKIP: 6,
  },
}

const Language = {
  UNKNOWN: 'Unknown',
  ARABIC: 'Arabic',
  SPANISH: 'Spanish',
  FRENCH: 'French',
  HINDI: 'Hindi',
  INDONESIAN: 'Indonesian',
  KOREAN: 'Korean',
  PORTBRAZIL: 'Portuguese Brazilian',
  RUSSIAN: 'Russian',
  THAI: 'Thai',
  TURKISH: 'Turkish',
  VIETNAMESE: 'Vietnamese',
  ENGLISH: 'English',
}

class ScriptException extends Error {
  plugin_type: string
  msg: any
  constructor(type, msg) {
    if (arguments.length == 1) {
      super(arguments[0])
      this.plugin_type = 'ScriptException'
      this.message = arguments[0]
    } else {
      super(msg)
      this.plugin_type = type ?? '' //string
      this.msg = msg ?? '' //string
    }
  }
}
class CaptchaRequiredException extends Error {
  plugin_type: string
  url: any
  body: any
  constructor(url, body) {
    super(JSON.stringify({ plugin_type: 'CaptchaRequiredException', url, body }))
    this.plugin_type = 'CaptchaRequiredException'
    this.url = url
    this.body = body
  }
}
class CriticalException extends ScriptException {
  constructor(msg) {
    super('CriticalException', msg)
  }
}
class UnavailableException extends ScriptException {
  constructor(msg) {
    super('UnavailableException', msg)
  }
}
class AgeException extends ScriptException {
  constructor(msg) {
    super('AgeException', msg)
  }
}
class TimeoutException extends ScriptException {
  constructor(msg) {
    super(msg)
    this.plugin_type = 'ScriptTimeoutException'
  }
}
class ScriptImplementationException extends ScriptException {
  constructor(msg) {
    super(msg)
    this.plugin_type = 'ScriptImplementationException'
  }
}

class Thumbnails {
  sources: any
  constructor(thumbnails) {
    this.sources = thumbnails ?? [] // Thumbnail[]
  }
}
class Thumbnail {
  url: any
  quality: any
  constructor(url, quality) {
    this.url = url ?? '' //string
    this.quality = quality ?? 0 //integer
  }
}

class PlatformID {
  platform: any
  pluginId: any
  value: any
  claimType: any
  claimFieldType: any
  constructor(platform, id, pluginId, claimType, claimFieldType) {
    this.platform = platform ?? '' //string
    this.pluginId = pluginId //string
    this.value = id //string
    this.claimType = claimType ?? 0 //int
    this.claimFieldType = claimFieldType ?? -1 //int
  }
}

class ResultCapabilities {
  types: any
  sorts: any
  filters: any
  constructor(types, sorts, filters) {
    this.types = types ?? []
    this.sorts = sorts ?? []
    this.filters = filters ?? []
  }
}
class FilterGroup {
  name: any
  filters: any
  isMultiSelect: any
  id: any
  constructor(name, filters, isMultiSelect, id) {
    if (!name) throw new ScriptException('No name for filter group')
    if (!filters) throw new ScriptException('No filter provided')

    this.name = name
    this.filters = filters
    this.isMultiSelect = isMultiSelect
    this.id = id
  }
}
class FilterCapability {
  name: any
  value: any
  id: any
  constructor(name, value, id) {
    if (!name) throw new ScriptException('No name for filter')
    if (!value) throw new ScriptException('No filter value')

    this.name = name
    this.value = value
    this.id = id
  }
}

class PlatformAuthorLink {
  id: any
  name: any
  url: any
  thumbnail: any
  subscribers: any
  membershipUrl: any
  constructor(id, name, url, thumbnail, subscribers, membershipUrl) {
    this.id = id ?? PlatformID() //PlatformID
    this.name = name ?? '' //string
    this.url = url ?? '' //string
    this.thumbnail = thumbnail //string
    if (subscribers) this.subscribers = subscribers
    if (membershipUrl) this.membershipUrl = membershipUrl ?? null //string (for backcompat)
  }
}
class PlatformAuthorMembershipLink {
  id: any
  name: any
  url: any
  thumbnail: any
  subscribers: any
  membershipUrl: any
  constructor(id, name, url, thumbnail, subscribers, membershipUrl) {
    this.id = id ?? PlatformID() //PlatformID
    this.name = name ?? '' //string
    this.url = url ?? '' //string
    this.thumbnail = thumbnail //string
    if (subscribers) this.subscribers = subscribers
    if (membershipUrl) this.membershipUrl = membershipUrl ?? null //string
  }
}
class PlatformContent {
  contentType: any
  id: any
  name: any
  thumbnails: any
  author: any
  datetime: any
  url: any
  constructor(obj, type) {
    this.contentType = type
    obj = obj ?? {}
    this.id = obj.id ?? PlatformID() //PlatformID
    this.name = obj.name ?? '' //string
    this.thumbnails = obj.thumbnails //Thumbnail[]
    this.author = obj.author //PlatformAuthorLink
    this.datetime = obj.datetime ?? obj.uploadDate ?? 0 //OffsetDateTime (Long)
    this.url = obj.url ?? '' //String
  }
}
class PlatformContentDetails {
  contentType: any
  constructor(type) {
    this.contentType = type
  }
}
class PlatformNestedMediaContent extends PlatformContent {
  contentUrl: any
  contentName: any
  contentDescription: any
  contentProvider: any
  contentThumbnails: any
  constructor(obj) {
    super(obj, 11)
    obj = obj ?? {}
    this.contentUrl = obj.contentUrl ?? ''
    this.contentName = obj.contentName
    this.contentDescription = obj.contentDescription
    this.contentProvider = obj.contentProvider
    this.contentThumbnails = obj.contentThumbnails ?? new Thumbnails([])
  }
}
class PlatformLockedContent extends PlatformContent {
  contentName: any
  contentThumbnails: any
  unlockUrl: any
  lockDescription: any
  constructor(obj) {
    super(obj, 70)
    obj = obj ?? {}
    this.contentName = obj.contentName
    this.contentThumbnails = obj.contentThumbnails ?? new Thumbnails([])
    this.unlockUrl = obj.unlockUrl ?? ''
    this.lockDescription = obj.lockDescription
  }
}
class PlatformVideo extends PlatformContent {
  plugin_type: string
  shareUrl: any
  duration: any
  viewCount: any
  isLive: any
  constructor(obj) {
    super(obj, 1)
    obj = obj ?? {}
    this.plugin_type = 'PlatformVideo'
    this.shareUrl = obj.shareUrl

    this.duration = obj.duration ?? -1 //Long
    this.viewCount = obj.viewCount ?? -1 //Long

    this.isLive = obj.isLive ?? false //Boolean
  }
}
class PlatformVideoDetails extends PlatformVideo {
  description: any
  video: any
  dash: any
  hls: any
  live: any
  rating: any
  subtitles: any
  constructor(obj) {
    super(obj)
    obj = obj ?? {}
    this.plugin_type = 'PlatformVideoDetails'

    this.description = obj.description ?? '' //String
    this.video = obj.video ?? {} //VideoSourceDescriptor
    this.dash = obj.dash ?? null //DashSource
    this.hls = obj.hls ?? null //HLSSource
    this.live = obj.live ?? null //VideoSource

    this.rating = obj.rating ?? null //IRating
    this.subtitles = obj.subtitles ?? []
  }
}

class PlatformPost extends PlatformContent {
  plugin_type: string
  images: any
  description: any
  constructor(obj) {
    super(obj, 2)
    obj = obj ?? {}
    this.plugin_type = 'PlatformPost'
    this.thumbnails = obj.thumbnails ?? []
    this.images = obj.images ?? []
    this.description = obj.description ?? ''
  }
}
class PlatformPostDetails extends PlatformPost {
  rating: any
  textType: any
  content: any
  constructor(obj) {
    super(obj)
    obj = obj ?? {}
    this.plugin_type = 'PlatformPostDetails'
    this.rating = obj.rating ?? new RatingLikes(-1)
    this.textType = obj.textType ?? 0
    this.content = obj.content ?? ''
  }
}

//Sources
class VideoSourceDescriptor {
  plugin_type: string
  isUnMuxed: boolean
  videoSources: any[]
  constructor(obj) {
    obj = obj ?? {}
    this.plugin_type = 'MuxVideoSourceDescriptor'
    this.isUnMuxed = false

    if (obj.constructor === Array) this.videoSources = obj
    else this.videoSources = obj.videoSources ?? []
  }
}
class UnMuxVideoSourceDescriptor {
  plugin_type: string
  isUnMuxed: boolean
  videoSources: any[]
  audioSources: any
  constructor(videoSourcesOrObj, audioSources) {
    videoSourcesOrObj = videoSourcesOrObj ?? {}
    this.plugin_type = 'UnMuxVideoSourceDescriptor'
    this.isUnMuxed = true

    if (videoSourcesOrObj.constructor === Array) {
      this.videoSources = videoSourcesOrObj
      this.audioSources = audioSources
    } else {
      this.videoSources = videoSourcesOrObj.videoSources ?? []
      this.audioSources = videoSourcesOrObj.audioSources ?? []
    }
  }
}

class VideoUrlSource {
  plugin_type: string
  width: any
  height: any
  container: any
  codec: any
  name: any
  bitrate: any
  duration: any
  url: any
  constructor(obj) {
    obj = obj ?? {}
    this.plugin_type = 'VideoUrlSource'
    this.width = obj.width ?? 0
    this.height = obj.height ?? 0
    this.container = obj.container ?? ''
    this.codec = obj.codec ?? ''
    this.name = obj.name ?? ''
    this.bitrate = obj.bitrate ?? 0
    this.duration = obj.duration ?? 0
    this.url = obj.url
  }
}
class VideoUrlRangeSource extends VideoUrlSource {
  itagId: any
  initStart: any
  initEnd: any
  indexStart: any
  indexEnd: any
  constructor(obj) {
    super(obj)
    this.plugin_type = 'VideoUrlRangeSource'

    this.itagId = obj.itagId ?? null
    this.initStart = obj.initStart ?? null
    this.initEnd = obj.initEnd ?? null
    this.indexStart = obj.indexStart ?? null
    this.indexEnd = obj.indexEnd ?? null
  }
}
class AudioUrlSource {
  plugin_type: string
  name: any
  bitrate: any
  container: any
  codec: any
  duration: any
  url: any
  language: any
  constructor(obj) {
    obj = obj ?? {}
    this.plugin_type = 'AudioUrlSource'
    this.name = obj.name ?? ''
    this.bitrate = obj.bitrate ?? 0
    this.container = obj.container ?? ''
    this.codec = obj.codec ?? ''
    this.duration = obj.duration ?? 0
    this.url = obj.url
    this.language = obj.language ?? Language.UNKNOWN
  }
}
class AudioUrlRangeSource extends AudioUrlSource {
  itagId: any
  initStart: any
  initEnd: any
  indexStart: any
  indexEnd: any
  audioChannels: any
  constructor(obj) {
    super(obj)
    this.plugin_type = 'AudioUrlRangeSource'

    this.itagId = obj.itagId ?? null
    this.initStart = obj.initStart ?? null
    this.initEnd = obj.initEnd ?? null
    this.indexStart = obj.indexStart ?? null
    this.indexEnd = obj.indexEnd ?? null
    this.audioChannels = obj.audioChannels ?? 2
  }
}
class HLSSource {
  plugin_type: string
  name: any
  duration: any
  url: any
  priority: any
  language: any
  constructor(obj) {
    obj = obj ?? {}
    this.plugin_type = 'HLSSource'
    this.name = obj.name ?? 'HLS'
    this.duration = obj.duration ?? 0
    this.url = obj.url
    this.priority = obj.priority ?? false
    if (obj.language) this.language = obj.language
  }
}
class DashSource {
  plugin_type: string
  name: any
  duration: any
  url: any
  language: any
  constructor(obj) {
    obj = obj ?? {}
    this.plugin_type = 'DashSource'
    this.name = obj.name ?? 'Dash'
    this.duration = obj.duration ?? 0
    this.url = obj.url
    if (obj.language) this.language = obj.language
  }
}

class RequestModifier {
  allowByteSkip: any
  constructor(obj) {
    obj = obj ?? {}
    this.allowByteSkip = obj.allowByteSkip
  }
}

//Channel
class PlatformChannel {
  plugin_type: string
  id: any
  name: any
  thumbnail: any
  banner: any
  subscribers: any
  description: any
  url: any
  urlAlternatives: any
  links: any
  constructor(obj) {
    obj = obj ?? {}
    this.plugin_type = 'PlatformChannel'
    this.id = obj.id ?? '' //string
    this.name = obj.name ?? '' //string
    this.thumbnail = obj.thumbnail //string
    this.banner = obj.banner //string
    this.subscribers = obj.subscribers ?? 0 //integer
    this.description = obj.description //string
    this.url = obj.url ?? '' //string
    this.urlAlternatives = obj.urlAlternatives ?? []
    this.links = obj.links ?? {} //Map<string,string>
  }
}

//Playlist
class PlatformPlaylist extends PlatformContent {
  plugin_type: string
  videoCount: any
  thumbnail: any
  constructor(obj) {
    super(obj, 4)
    this.plugin_type = 'PlatformPlaylist'
    this.videoCount = obj.videoCount ?? 0
    this.thumbnail = obj.thumbnail
  }
}
class PlatformPlaylistDetails extends PlatformPlaylist {
  contents: any
  constructor(obj) {
    super(obj)
    this.plugin_type = 'PlatformPlaylistDetails'
    this.contents = obj.contents
  }
}

//Ratings
class RatingLikes {
  type: number
  likes: any
  constructor(likes) {
    this.type = 1
    this.likes = likes
  }
}
class RatingLikesDislikes {
  type: number
  likes: any
  dislikes: any
  constructor(likes, dislikes) {
    this.type = 2
    this.likes = likes
    this.dislikes = dislikes
  }
}
class RatingScaler {
  type: number
  value: any
  constructor(value) {
    this.type = 3
    this.value = value
  }
}

class PlatformComment {
  plugin_type: string
  contextUrl: any
  author: any
  message: any
  rating: any
  date: any
  replyCount: any
  context: any
  constructor(obj) {
    this.plugin_type = 'Comment'
    this.contextUrl = obj.contextUrl ?? ''
    this.author = obj.author ?? new PlatformAuthorLink(null, '', '', null)
    this.message = obj.message ?? ''
    this.rating = obj.rating ?? new RatingLikes(0)
    this.date = obj.date ?? 0
    this.replyCount = obj.replyCount ?? 0
    this.context = obj.context ?? {}
  }
}

//Temporary backwards compat
class Comment extends PlatformComment {
  constructor(obj) {
    super(obj)
  }
}

class PlaybackTracker {
  nextRequest: any
  constructor(interval) {
    this.nextRequest = interval ?? 10 * 1000
  }
  setProgress(seconds) {
    throw new ScriptImplementationException(
      'Missing required setProgress(seconds) on PlaybackTracker',
    )
  }
}

class LiveEventPager {
  plugin_type: string
  results: any
  hasMore: any
  context: any
  nextRequest: number
  constructor(results, hasMore, context) {
    this.plugin_type = 'LiveEventPager'
    this.results = results ?? []
    this.hasMore = hasMore ?? false
    this.context = context ?? {}
    this.nextRequest = 4000
  }

  hasMorePagers() {
    return this.hasMore
  }
  nextPage() {
    return new Pager([], false, this.context)
  }
}

class LiveEvent {
  type: any
  constructor(type) {
    this.type = type
  }
}
class LiveEventComment extends LiveEvent {
  name: any
  message: any
  thumbnail: any
  colorName: any
  badges: any
  constructor(name, message, thumbnail, colorName, badges) {
    super(1)
    this.name = name
    this.message = message
    this.thumbnail = thumbnail
    this.colorName = colorName
    this.badges = badges
  }
}
class LiveEventEmojis extends LiveEvent {
  emojis: any
  constructor(emojis) {
    super(4)
    this.emojis = emojis
  }
}
class LiveEventDonation extends LiveEvent {
  amount: any
  name: any
  message: any
  thumbnail: any
  expire: any
  colorDonation: any
  constructor(amount, name, message, thumbnail, expire, colorDonation) {
    super(5)
    this.amount = amount
    this.name = name
    this.message = message ?? ''
    this.thumbnail = thumbnail
    this.expire = expire
    this.colorDonation = colorDonation
  }
}
class LiveEventViewCount extends LiveEvent {
  viewCount: any
  constructor(viewCount) {
    super(10)
    this.viewCount = viewCount
  }
}
class LiveEventRaid extends LiveEvent {
  targetUrl: any
  targetName: any
  targetThumbnail: any
  constructor(targetUrl, targetName, targetThumbnail) {
    super(100)
    this.targetUrl = targetUrl
    this.targetName = targetName
    this.targetThumbnail = targetThumbnail
  }
}

//Pagers
class ContentPager {
  plugin_type: string
  results: any
  hasMore: any
  context: any
  constructor(results, hasMore, context) {
    this.plugin_type = 'ContentPager'
    this.results = results ?? []
    this.hasMore = hasMore ?? false
    this.context = context ?? {}
  }

  hasMorePagers() {
    return this.hasMore
  }
  nextPage() {
    return new ContentPager([], false, this.context)
  }
}
class VideoPager {
  plugin_type: string
  results: any
  hasMore: any
  context: any
  constructor(results, hasMore, context) {
    this.plugin_type = 'VideoPager'
    this.results = results ?? []
    this.hasMore = hasMore ?? false
    this.context = context ?? {}
  }

  hasMorePagers() {
    return this.hasMore
  }
  nextPage() {
    return new VideoPager([], false, this.context)
  }
}
class ChannelPager {
  plugin_type: string
  results: any
  hasMore: any
  context: any
  constructor(results, hasMore, context) {
    this.plugin_type = 'ChannelPager'
    this.results = results ?? []
    this.hasMore = hasMore ?? false
    this.context = context ?? {}
  }

  hasMorePagers() {
    return this.hasMore
  }
  nextPage() {
    return new Pager([], false, this.context)
  }
}
class PlaylistPager {
  plugin_type: string
  results: any
  hasMore: any
  context: any
  constructor(results, hasMore, context) {
    this.plugin_type = 'PlaylistPager'
    this.results = results ?? []
    this.hasMore = hasMore ?? false
    this.context = context ?? {}
  }

  hasMorePagers() {
    return this.hasMore
  }
  nextPage() {
    return new Pager([], false, this.context)
  }
}
class CommentPager {
  plugin_type: string
  results: any
  hasMore: any
  context: any
  constructor(results, hasMore, context) {
    this.plugin_type = 'CommentPager'
    this.results = results ?? []
    this.hasMore = hasMore ?? false
    this.context = context ?? {}
  }

  hasMorePagers() {
    return this.hasMore
  }
  nextPage() {
    return new Pager([], false, this.context)
  }
}

function throwException(type, message) {
  throw new Error('V8EXCEPTION:' + type + '-' + message)
}

const plugin = {
  config: {},
  settings: {},
}

//To override by plugin
const source = {
  getHome() {
    return new ContentPager([], false, {})
  },

  enable(config) {},
  disable() {},

  searchSuggestions(query) {
    return []
  },
  getSearchCapabilities() {
    return { types: [], sorts: [] }
  },
  search(query, type, order, filters) {
    return new ContentPager([], false, {})
  }, //TODO
  //OPTIONAL getSearchChannelContentsCapabilities(){ return { types: [], sorts: [] }; },
  //OPTIONAL searchChannelContents(channelUrl, query, type, order, filters){ return new Pager([], false, {}); }, //TODO

  isChannelUrl(url: string) {
    return false
  },
  getChannel(url: string) {
    return null
  },
  getChannelCapabilities() {
    return { types: [], sorts: [] }
  },
  getChannelContents(url, type, order, filters) {
    return new ContentPager([], false, {})
  },

  isContentDetailsUrl(url: string) {
    return false
  },
  getContentDetails(url: string) {},
  getComments(url: string) {},
  getSubComments(comment) {},
  isPlaylistUrl(url: string) {},
  getPlaylist(url: string) {},
  getUserPlaylists() {},
  getUserSubscriptions() {},
}

function parseSettings(settings) {
  if (!settings) return {}
  const newSettings = {}
  for (const key in settings) {
    if (typeof settings[key] == 'string') newSettings[key] = JSON.parse(settings[key])
    else newSettings[key] = settings[key]
  }
  return newSettings
}

function log(str: any) {
  if (str) {
    console.log(str)
    if (typeof str == 'string') bridge.log(str)
    else bridge.log(JSON.stringify(str, null, 4))
  }
}

function encodePathSegment(segment) {
  return encodeURIComponent(segment).replace(/[!'()*]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16)
  })
}

class URLSearchParams {
  _entries: {}
  constructor(init) {
    this._entries = {}
    if (typeof init === 'string') {
      if (init !== '') {
        init = init.replace(/^\?/, '')
        const attributes = init.split('&')
        let attribute
        for (let i = 0; i < attributes.length; i++) {
          attribute = attributes[i].split('=')
          this.append(
            decodeURIComponent(attribute[0]),
            attribute.length > 1 ? decodeURIComponent(attribute[1]) : '',
          )
        }
      }
    } else if (init instanceof URLSearchParams) {
      init.forEach((value, name) => {
        this.append(value, name)
      })
    }
  }
  append(name, value) {
    value = value.toString()
    if (name in this._entries) {
      this._entries[name].push(value)
    } else {
      this._entries[name] = [value]
    }
  }
  delete(name) {
    delete this._entries[name]
  }
  get(name) {
    return name in this._entries ? this._entries[name][0] : null
  }
  getAll(name) {
    return name in this._entries ? this._entries[name].slice(0) : []
  }
  has(name) {
    return name in this._entries
  }
  set(name, value) {
    this._entries[name] = [value.toString()]
  }
  forEach(callback) {
    let entries
    for (let name in this._entries) {
      if (this._entries.hasOwnProperty(name)) {
        entries = this._entries[name]
        for (let i = 0; i < entries.length; i++) {
          callback.call(this, entries[i], name, this)
        }
      }
    }
  }
  keys() {
    const items = []
    this.forEach((value, name) => {
      items.push(name)
    })
    return createIterator(items)
  }
  values() {
    const items = []
    this.forEach((value) => {
      items.push(value)
    })
    return createIterator(items)
  }
  entries() {
    const items = []
    this.forEach((value, name) => {
      items.push([value, name])
    })
    return createIterator(items)
  }
  toString() {
    let searchString = ''
    this.forEach((value, name) => {
      if (searchString.length > 0) searchString += '&'
      searchString += encodeURIComponent(name) + '=' + encodeURIComponent(value)
    })
    return searchString
  }
}

interface BridgeHttpResponse {
  url: string
  code: number
  body: string
  isOk: string
}

interface HttpCommon<ReturnType> {
  GET(url: string, headers: { [key: string]: string }, useAuthClient?: boolean): ReturnType
  POST(
    url: string,
    body: string,
    headers: { [key: string]: string },
    useAuthClient?: boolean,
  ): ReturnType
  request(
    method: string,
    url: string,
    headers: { [key: string]: string },
    useAuthClient: boolean,
  ): ReturnType
  requestWithBody(
    method: string,
    url: string,
    body: string,
    headers: { [key: string]: string },
    useAuthClient: boolean,
  ): ReturnType
}

interface HttpBatchBuilder extends HttpCommon<HttpBatchBuilder> {
  execute(): BridgeHttpResponse[]
}

interface Http extends HttpCommon<BridgeHttpResponse> {
  batch(): HttpBatchBuilder
  getDefaultClient(useAuthClient: boolean): { clientId: string }
}

declare const http: Http
