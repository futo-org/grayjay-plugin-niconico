const PLATFORM = "Niconico";
const PLATFORM_CLAIMTYPE = 21;

const URL_RECOMMENDED_FEED = "https://nvapi.nicovideo.jp/v1/recommend?recipeId=video_recommendation_recommend&sensitiveContents=mask&site=nicovideo&_frontendId=6&_frontendVersion=0";

var config = {};

//#region Plugin Hooks

source.enable = function(conf){
	config = conf ?? {};
	//log(config);
}
source.getHome = function() {
	return new NicoVideoPager().nextPage();
};

//#endregion

//#region Pagers

class NicoVideoPager extends VideoPager {
	constructor({ videos = [], hasMore = true, ctx = {} } = {}) {
		super(videos, hasMore, ctx);
	}
	
	nextPage() {
		const res = http.GET(URL_RECOMMENDED_FEED, {});

		if (!res.isOk) {
	    throw new ScriptException("Failed request [" + URL_RECOMMENDED_FEED + "] (" + resp.code + ")");
		}

		const nicoVideos = JSON.parse(res.body).data.items;
		const platformVideos = nicoVideos.map(nicoVideoToPlatformVideo).filter(x => x);

		return new NicoVideoPager({ videos: platformVideos, hasMore: false })
	}
}

//#endregion

//#region Parsing

function nicoVideoToPlatformVideo(nicoVideo) {
	const v = nicoVideo.content;

	const videoUrl = `https://www.nicovideo.jp/watch/${v.id}`;
	const thumbnailUrl = v.thumbnail.listingUrl;
	const uploadDate = dateToUnixSeconds(v.registeredAt);

	const platformVideo = {
		id: v.id && new PlatformID(PLATFORM, v.id, config.id),
		name: v.title,
		thumbnails: thumbnailUrl && new Thumbnails([new Thumbnail(thumbnailUrl, 0)]),
		duration: v.duration,
		viewCount: v.count.view,
		url: videoUrl,
		isLive: false, // TODO There is v.videoLive but it seems always false
		uploadDate,
		shareUrl: videoUrl,
		author: new PlatformAuthorLink(
			new PlatformID(PLATFORM, v.owner.id, config.id),
			v.owner.name,
			`https://www.nicovideo.jp/user/${v.owner.id}`,
			v.owner.iconUrl
		),
	}

	return new PlatformVideo(platformVideo);
}

//#endregion

//#region Utility

/**
 * Convert a Date to a unix time stamp
 * @param {Date?} date Date to convert
 * @returns {Number?} Unix time stamp
 */
function dateToUnixSeconds(date) {
	if (!date) {
		return null;
	}

	return Math.round(Date.parse(date) / 1000);
}

//#endregion
