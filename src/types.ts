//#region custom types
export type Settings = unknown

export type NiconicoSource = Required<Omit<Source<
    never,
    string,
    ChannelTypeCapabilities,
    SearchTypes,
    FeedType,
    Settings
>,
    "getSearchChannelContentsCapabilities"
    | "searchChannelContents"
    | "getLiveChatWindow"
    | "saveState"
    | "searchChannels"
    | "getComments"
    | "getSubComments"
    | "getPlaybackTracker"
>>

export type ChannelTypeCapabilities = typeof Type.Feed.Videos
export type SearchTypes = typeof Type.Feed.Videos | typeof Type.Feed.Live
export type FilterGroupIDs = "ADDITIONAL_CONTENT"
//#endregion

//#region JSON types
type ThreadTypes = "main" | "owner" | "easy"
export type ThreadsResponse = {
    readonly data: {
        readonly threads: {
            readonly fork: ThreadTypes
            readonly comments: {
                readonly vposMs: number
                readonly body: string
                readonly commands: ("184" | "shita" | "big" | "small" | "medium")[]
            }[]
        }[]
    }
}
export type VideoResponse = {
    readonly data: {
        readonly response: {
            readonly errorCode: "FORBIDDEN"
        }
    }
} | {
    readonly data: {
        readonly metadata: {
            readonly jsonLds: unknown
        }
        readonly response: {
            readonly errorCode: undefined
            readonly comment: {
                readonly nvComment: {
                    readonly server: string
                    readonly threadKey: string
                    readonly params: {
                        readonly targets: {
                            id: string,
                            fork: ThreadTypes
                        }[]
                        readonly language: "ja-jp" | "en-us"
                    }
                }
            }
            readonly client: {
                readonly watchTrackId: string
            }
            readonly media: {
                readonly domand: {
                    readonly audios: {
                        readonly id: string
                        readonly isAvailable: boolean
                    }[]
                    readonly videos: {
                        readonly id: string
                        readonly isAvailable: boolean
                    }[]
                    readonly accessRightKey: string
                }
            }
            readonly owner: {
                readonly id: number
                nickname: string
                iconUrl: string
            }
            readonly video: {
                readonly title: string
                readonly description: string
                readonly count: {
                    readonly view: number
                    readonly like: number
                }
                readonly duration: number
                readonly thumbnail: {
                    readonly ogp: string
                }
                readonly registeredAt: string
            }
        }
    }
}
export type FeedResponse = {
    readonly data: {
        readonly items: ({
            readonly contentType: "video"
            readonly content: Content
        } | {
            readonly contentType: "mylist"
        })[]
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
export type SearchSuggestionsResponse = {
    readonly candidates: string[]
}
export type SearchLiveVideosResponse = {
    readonly searchResult: {
        readonly programs: {
            readonly onair: OnAirData[]
        }
    }
}
export type OnAirData = {
    readonly id: string
    readonly programProvider: {
        readonly id: string
        readonly name: string
        readonly icon: string
    }
    readonly title: string
    readonly listingThumbnail: string
    readonly statistics: {
        readonly watchCount: number
    }
    readonly beginAt: number
}
export type UserResponse = {
    readonly state: {
        readonly userDetails: {
            readonly userDetails: {
                readonly user: {
                    readonly decoratedDescriptionHtml: string
                    readonly followerCount: number
                    readonly nickname: string
                    readonly icons: {
                        readonly large: string
                    }
                    readonly coverImage: null | {
                        readonly ogpUrl: string
                    }
                }
            }
        }
    }
}
export type ChannelVideosResponse = {
    readonly data: {
        readonly totalCount: number
        readonly items: {
            readonly essential: Content
        }[]
    }
}
export type SearchVideosResponse = {
    readonly data: {
        readonly hasNext: boolean
        readonly items: Content[]
    }
}
export type PlaylistResponse = {
    readonly data: {
        readonly mylist: {
            readonly name: string
            readonly totalItemCount: number
            readonly owner: {
                iconUrl: string
                id: string
                name: string
            }
            readonly items: {
                readonly video: Content
            }[]
        }
    }
}
export type WatchLaterResponse = {
    readonly data: {
        readonly watchLater: {
            readonly totalCount: number
            readonly hasNext: boolean
            readonly items: {
                readonly video: Content
            }[]
        }
    }
}
export type SeriesResponse = {
    readonly data: {
        readonly totalCount: number
        readonly detail: {
            readonly createdAt: string
            readonly title: string
            readonly owner: {
                readonly user: {
                    readonly id: number
                    readonly nickname: string
                    readonly icons: {
                        readonly large: string
                    }
                }
            }
            readonly id: string
            readonly thumbnailUrl: string
        }
        readonly items: {
            readonly video: Content
        }[]
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
        readonly summary: {
            readonly hasNext: boolean
            readonly cursor: "cursorEnd" | string
        }
    }
}
export type PlaylistSearchResponse = {
    readonly data: {
        readonly hasNext: boolean
        readonly items: NiconicoList[]
    }
}
export type NiconicoList = {
    readonly id: number
    readonly title: string
    readonly owner: {
        readonly iconUrl: string
        readonly id: string
        readonly name: string
    }
    readonly thumbnailUrl: string
    readonly videoCount: number
}
export type ChannelPlaylistsResponse = {
    readonly data: {
        readonly mylists: NiconicoChannelList[]
    }
}
export type NiconicoChannelList = {
    readonly id: number
    readonly name: string
    readonly owner: {
        readonly iconUrl: string
        readonly id: string
        readonly name: string
    }
    readonly itemsCount: number
}
export type ChannelSeriesResponse = {
    readonly data: {
        readonly items: NiconicoChannelSeries[]
        readonly totalCount: number
    }
}
export type NiconicoChannelSeries = {
    readonly id: number
    readonly title: string
    readonly thumbnailUrl: string
    readonly owner: {
        readonly id: string
    }
    readonly itemsCount: number
}
//#endregion
