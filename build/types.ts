//#region custom types
export type Settings = unknown

export type NiconicoSource = Required<Omit<Source<
    NiconicoCommentContext,
    string,
    ChannelTypeCapabilities,
    SearchTypes,
    FeedType,
    Settings
>,
    "getSearchChannelContentsCapabilities"
    | "searchChannelContents"
    | "getLiveChatWindow"
    | "searchPlaylists"
    | "saveState"
    | "getContentRecommendations"
    | "getChannelCapabilities"
    | "searchChannels"
    | "getSubComments"
    | "getChannelPlaylists"
    | "getPlaybackTracker"
>>

export type NiconicoCommentContext = {
    readonly comment_id: string
    /** video id */
    readonly aweme_id: string
}
export type ChannelTypeCapabilities = typeof Type.Feed.Videos
export type SearchTypes = typeof Type.Feed.Videos | typeof Type.Feed.Live | typeof Type.Feed.Mixed
//#endregion

//#region JSON types
export type FeedResponse = {
    readonly data: {
        readonly items: {
            readonly content: Content
        }[]
    }
}
export type Content = {
    readonly id: string
    readonly title: string
    readonly duration: number
    readonly thumbnail: {
        readonly listingUrl: string
    }
    readonly count: {
        readonly view: number
    }
    readonly registeredAt: string
    readonly owner: {
        readonly id: string
        readonly name: string
        readonly iconUrl: string
    }
}
export type SearchContent = {
    readonly title: string
    readonly contentId: string
    readonly userId: unknown
    readonly lengthSeconds: number
    readonly viewCounter: number
    readonly thumbnailUrl: string
    readonly startTime: string
}
export type SearchSuggestionsResponse = {
    readonly candidates: string[]
}
export type SearchVideosResponse = {
    readonly data: SearchContent[]
}
export type PageDataResponse = {
    readonly comment: {
        readonly nvComment: {
            readonly params: unknown
            readonly threadKey: string
        }
    }
}
export type PlaylistPageDataResponse = {
    readonly initConfig: {
        readonly user: {
            readonly id: string
        }
    }
}
export type UserPageDataResponse = {
    readonly state: {
        readonly userDetails: {
            readonly userDetails: {
                readonly user: unknown
            }
        }
    }
}
export type VideoPageDataResponse = {
    readonly client: {
        readonly watchTrackId: string
    }
    readonly media: {
        readonly domand: {
            readonly accessRightKey: string
        }
    }
}
export type CommentsResponse = {
    readonly nicoComments: {
        readonly data: {
            readonly threads: {
                readonly fork: "main"
                readonly comments: {
                    readonly body: string
                }
            }[]
        }
    }
}
export type ChannelVideosResponse = {
    readonly data: {
        readonly items: {
            readonly essential: Content
        }[]
    }
}
export type PlaylistResponse = {
    readonly data: {
        readonly mylist: {
            readonly items: {
                readonly video: Content
            }[]
        }
    }
}
export type UserPlaylistsResponse = {
    readonly data: {
        readonly mylists: {
            readonly id: unknown
        }[]
    }
}
export type UserSubscriptionsResponse = {
    readonly data: {
        readonly items: {
            readonly id: unknown
        }[]
    }
}
export type HLSResponse = {
    readonly data: {
        readonly contentUrl: string
    }
}
//#endregion
