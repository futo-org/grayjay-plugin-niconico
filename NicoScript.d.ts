//Reference Scriptfile
//Intended exclusively for auto-complete in your IDE, not for execution

declare class ScriptException extends Error {
  constructor(type: string, msg: string)
}
declare class TimeoutException extends ScriptException {
  constructor(msg: string)
}
declare class UnavailableException extends ScriptException {
  constructor(msg: string)
}
declare class ScriptImplementationException extends ScriptException {
  constructor(msg: string)
}

declare class Thumbnails {
  constructor(thumbnails: Thumbnail[])
}
declare class Thumbnail {
  url: string
  quality: number
}

declare class PlatformID {
  constructor(
    platform: string,
    id: string,
    pluginId: string,
    claimType: number,
    claimFieldType: number,
  )
}

declare class ResultCapabilities {
  constructor(types: string[], sorts: string[], filters: FilterGroup[])
}
declare class FilterGroup {
  constructor(
    name: string,
    filters: string[],
    isMultiSelect: boolean,
    id: string,
  )
}
declare class FilterCapability {
  constructor(name: string, value: string, id: string)
}

declare class PlatformAuthorLink {
  constructor(
    id: PlatformID,
    name: string,
    url: string,
    thumbnail: string,
    subscribers?: number,
  )
}

declare interface PlatformContentDef {
  id: PlatformID
  name: string
  author: PlatformAuthorLink
  datetime: number
  url: string
}
declare interface PlatformNestedMediaContentDef extends PlatformContentDef {
  contentUrl: string
  contentName?: string
  contentDescription?: string
  contentProvider?: string
  contentThumbnails: Thumbnails
}
declare class PlatformNestedMediaContent {
  constructor(obj: PlatformNestedMediaContentDef)
}

declare interface PlatformVideoDef extends PlatformContentDef {
  thumbnails: Thumbnails
  author: PlatformAuthorLink

  duration: number
  viewCount: number
  isLive: boolean
}
declare interface PlatformContent {}

declare class PlatformVideo implements PlatformContent {
  constructor(obj: PlatformVideoDef)
}

declare interface PlatformVideoDetailsDef extends PlatformVideoDef {
  description: string
  video: IVideoSourceDescriptor
  live: SubtitleSource[]
  rating: IRating
}
declare class PlatformVideoDetails extends PlatformVideo {
  constructor(obj: PlatformVideoDetailsDef)
}

declare class PlatformPostDef implements PlatformContentDef {
  thumbnails: string[]
  images: string[]
  description: string
}
declare class PlatformPost implements PlatformContent {
  constructor(obj: PlatformPostDef)
}

declare class PlatformPostDetailsDef extends PlatformPostDef {
  rating: IRating
  textType: number
  content: string
}
declare class PlatformPostDetails extends PlatformPost {
  constructor(obj: PlatformPostDetailsDef)
}

//Sources
declare interface IVideoSourceDescriptor {}

declare interface MuxVideoSourceDescriptorDef {
  isUnMuxed: boolean
  videoSources: IVideoSource[]
}
declare class MuxVideoSourceDescriptor implements IVideoSourceDescriptor {
  constructor(obj: VideoSourceDescriptorDef)
}

declare interface UnMuxVideoSourceDescriptorDef {
  isUnMuxed: boolean
  videoSources: IVideoSource[]
}
declare class UnMuxVideoSourceDescriptor implements IVideoSourceDescriptor {
  constructor(videoSourcesOrObj: IVideoSource[], audioSources: IAudioSource[])
  constructor(videoSourcesOrObj: UnMuxVideoSourceDescriptorDef)
}

declare interface IVideoSource {}
declare interface IAudioSource {}
interface VideoUrlSourceDef extends IVideoSource {
  width: number
  height: number
  container: string
  codec: string
  name: string
  bitrate: number
  duration: number
  url: string
}
declare class VideoUrlSource {
  constructor(obj: VideoUrlSourceDef)

  getRequestModifier(): RequestModifier | undefined
}
interface VideoUrlRangeSourceDef extends VideoUrlSource {
  itagId: number
  initStart: number
  initEnd: number
  indexStart: number
  indexEnd: number
}
declare class VideoUrlRangeSource extends VideoUrlSource {
  constructor(obj: YTVideoSourceDef)
}
interface AudioUrlSourceDef {
  name: string
  bitrate: number
  container: string
  codecs: string
  duration: number
  url: string
  language: string
}
declare class AudioUrlSource implements IAudioSource {
  constructor(obj: AudioUrlSourceDef)

  getRequestModifier(): RequestModifier | undefined
}
interface IRequest {
  url: string
  headers: Map<string, string>
}
interface IRequestModifierDef {
  allowByteSkip: boolean
}
declare class RequestModifier {
  constructor(obj: IRequestModifierDef)

  modifyRequest(url: string, headers: Map<string, string>): IRequest
}
interface AudioUrlRangeSourceDef extends AudioUrlSource {
  itagId: number
  initStart: number
  initEnd: number
  indexStart: number
  indexEnd: number
  audioChannels: number
}
declare class AudioUrlRangeSource extends AudioUrlSource {
  constructor(obj: AudioUrlRangeSourceDef)
}
interface HLSSourceDef {
  name: string
  duration: number
  url: string
}
declare class HLSSource implements IVideoSource {
  constructor(obj: HLSSourceDef)
}
interface DashSourceDef {
  name: string
  duration: number
  url: string
}
declare class DashSource implements IVideoSource {
  constructor(obj: DashSourceDef)
}

//Channel
interface PlatformChannelDef {
  id: PlatformID
  name: string
  thumbnail: string
  banner: string
  subscribers: number
  description: string
  url: string
  links?: Map<string, string>
}
declare class PlatformChannel {
  constructor(obj: PlatformChannelDef)
}

//Ratings
interface IRating {
  type: number
}
declare class RatingLikes implements IRating {
  constructor(likes: number)
}
declare class RatingLikesDislikes implements IRating {
  constructor(likes: number, dislikes: number)
}
declare class RatingScaler implements IRating {
  constructor(value: number)
}

declare interface CommentDef {
  contextUrl: string
  author: PlatformAuthorLink
  message: string
  rating: IRating
  date: number
  replyCount: number
  context: any
}
declare class PlatformComment {
  constructor(obj: CommentDef)
}

declare class LiveEventPager {
  nextRequest: number

  constructor(results: LiveEvent[], hasMore: boolean, context: any)

  hasMorePagers(): boolean
  nextPage(): LiveEventPager //Could be self
}

declare class LiveEvent {
  type: string
}
declare class LiveEventComment extends LiveEvent {
  constructor(
    name: string,
    message: string,
    thumbnail?: string,
    colorName?: string,
    badges: string[],
  )
}
declare class LiveEventEmojis extends LiveEvent {
  constructor(name: Map<string, string>)
}
declare class LiveEventDonation extends LiveEvent {
  constructor(
    amount: number,
    name: string,
    message: string,
    thumbnail?: string,
    expire: number,
    colorDonation?: string,
  )
}
declare class LiveEventViewCount extends LiveEvent {
  constructor(viewCount: number)
}
declare class LiveEventRaid extends LiveEvent {
  constructor(targetUrl: string, targetName: string, targetThumbnail: string)
}

//Pagers
declare class ContentPager {
  constructor(results: PlatformContent[], hasMore: boolean)

  hasMorePagers(): boolean
  nextPage(): VideoPager //Could be self
}
declare class VideoPager {
  constructor(results: PlatformVideo[], hasMore: boolean)

  hasMorePagers(): boolean
  nextPage(): VideoPager //Could be self
}
declare class ChannelPager {
  constructor(results: PlatformChannel[], hasMore: boolean)

  hasMorePagers(): boolean
  nextPage(): ChannelPager //Could be self
}
declare class CommentPager {
  constructor(results: PlatformComment[], hasMore: boolean)

  hasMorePagers(): boolean
  nextPage(): CommentPager //Could be self
}

//To override by plugin

interface Source {
  getHome(): VideoPager

  enable(config: SourceConfig, settings: any, savedState?: string)
  disable()

  saveState(): string

  searchSuggestions(query: string): string[]
  search(query: string, type: string, order: string, filters): ContentPager
  getSearchCapabilities(): ResultCapabilities

  //Optional
  searchChannelContents(
    channelUrl: string,
    query: string,
    type: string,
    order: string,
    filters,
  ): ContentPager
  //Optional
  getSearchChannelContentsCapabilities(): ResultCapabilities

  //Optional
  getChannelUrlByClaim(claimType: number, values: Map<number, string>)

  isChannelUrl(url: string): boolean
  getChannel(url: string): PlatformChannel

  getChannelContents(
    url: string,
    type: string,
    order: string,
    filters,
  ): ContentPager
  getChannelCapabilities(): ResultCapabilities

  isContentDetailsUrl(url: string): boolean
  getContentDetails(url: string): PlatformVideoDetails

  getLiveEvents(url: string): LiveEventPager

  //Optional
  getComments(url: string): CommentPager
  //Optional
  getSubComments(comment: PlatformComment): CommentPager

  //Optional
  getUserSubscriptions(): string[]
  //Optional
  getUserPlaylists(): string[]

  //Optional
  isPlaylistUrl(url: string): boolean
  //Optional
  getPlaylist(url): string[]
}

interface BridgeHttpResponse {
  url: string
  code: number
  body: string
  isOk: string
}

interface Http {
  GET(
    url: string,
    headers: Map<string, string>,
    useAuthClient: boolean,
  ): BridgeHttpResponse
  POST(
    url: string,
    body: string,
    headers: Map<string, string>,
    useAuthClient: boolean,
  ): BridgeHttpResponse
  request(
    method: string,
    url: string,
    headers: Map<string, string>,
    useAuthClient: boolean,
  ): BridgeHttpResponse
  requestWithBody(
    method: string,
    url: string,
    body: string,
    headers: Map<string, string>,
    useAuthClient: boolean,
  ): BridgeHttpResponse
}

declare const source: Source

declare const http: Http
