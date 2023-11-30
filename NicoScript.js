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
	class RecommendedVideoPager extends VideoPager {
		constructor({ videos = [], hasMore = true, context = {} } = {}) {
			super(videos, hasMore, context);
		}
		
		nextPage() {
			const res = http.GET(URL_RECOMMENDED_FEED, {});
	
			if (!res.isOk) {
				throw new ScriptException("Failed request [" + URL_RECOMMENDED_FEED + "] (" + res.code + ")");
			}
	
			const nicoVideos = JSON.parse(res.body).data.items;
			const platformVideos = nicoVideos.map(nicoVideoJSONToPlatformVideo).filter(x => x);
	
			return new RecommendedVideoPager({ videos: platformVideos, hasMore: false })
		}
	}

	return new RecommendedVideoPager().nextPage();
};

source.searchSuggestions = function(query) {
	const url = `https://sug.search.nicovideo.jp/suggestion/expand/${query}`
	const res = http.GET(url, {})

	if (!res.isOk) {
		throw new ScriptException("Failed request [" + url + "] (" + res.code + ")");
	}

	const suggestions = JSON.parse(res.body).candidates;

	return suggestions;
};

source.getSearchCapabilities = () => {
	return { types: [Type.Feed.Mixed], sorts: [], filters: [] }
}

// source.search = function (query) {
// 	class SearchVideoPager extends VideoPager {
// 		constructor({ videos = [], hasMore = true, context = { query } } = {}) {
// 			super(videos, hasMore, context);
// 		}
		
// 		nextPage() {
// 			const url = `asdf${query}`;
	
// 			const res = http.GET(url, {});
	
// 			if (!res.isOk) {
// 				throw new ScriptException("Failed request [" + URL_SEARCH + "] (" + res.code + ")");
// 			}
	
// 			const nicoVideos = JSON.parse(res.body).data.items;
// 			const platformVideos = nicoVideos.map(nicoVideoJSONToPlatformVideo).filter(x => x);
	
// 			return new RecommendedVideoPager({ videos: platformVideos, hasMore: false })
// 		}
// 	}

// 	return new SearchVideoPager({ query }).nextPage();
// };

source.getContentDetails = function(videoUrl) {
	const videoId = getVideoIdFromUrl(videoUrl)
	const getThumbInfoUrl = `https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`;

	const res = http.GET(getThumbInfoUrl, {});
	
	if (!res.isOk) {
		throw new ScriptException("Failed request [" + url + "] (" + res.code + ")");
	}

	const platformVideo = nicoVideoXMLToPlatformVideo(res.body);

	debugger;

	return platformVideo;
};

//#endregion

//#region Parsing

function nicoVideoXMLToPlatformVideo(xml) {
	const videoId = querySelectorXML(xml, "video_id");
	const title = querySelectorXML(xml, "title");
	const thumbnailUrl = querySelectorXML(xml, "thumbnail_url");
	const duration = hhmmssToDuration(querySelectorXML(xml, "length"));
	const viewCount = querySelectorXML(xml, "view_counter");
	const videoUrl = querySelectorXML(xml, "watch_url");
	const uploadDate = dateToUnixSeconds(querySelectorXML(xml, "first_retrieve"));
	const authorId = querySelectorXML(xml, "user_id");
	const authorName = querySelectorXML(xml, "user_nickname");
	const authorImage = querySelectorXML(xml, "user_icon_url");

	return new PlatformVideo({
		id: videoId && new PlatformID(PLATFORM, videoId, config.id),
		name: title,
		thumbnails: thumbnailUrl && new Thumbnails([new Thumbnail(thumbnailUrl, 0)]),
		duration,
		viewCount,
		url: videoUrl,
		isLive: false,
		uploadDate,
		shareUrl: videoUrl,
		author: new PlatformAuthorLink(
			new PlatformID(PLATFORM, authorId, config.id),
			authorName,
			`https://www.nicovideo.jp/user/${authorId}`,
			authorImage
		),
	});
}

function nicoVideoJSONToPlatformVideo(nicoVideo) {
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
		isLive: false,
		uploadDate,
		shareUrl: videoUrl,
		author: new PlatformAuthorLink(
			new PlatformID(PLATFORM, v.owner.id, config.id),
			v.owner.name,
			`https://www.nicovideo.jp/user/${v.owner.id}`,
			v.owner.iconUrl
		),
	};

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

/**
 * Gets the video id from an URL
 * @param {String?} url The URL
 * @returns {String?} The video id
 */
function getVideoIdFromUrl(url) {
  if (!url) {
    return null;
  }

  const match = /.*nicovideo.jp\/watch\/(.*)/.exec(url);
  return match ? match[1] : null;
}

/**
 * Format a duration string to a duration in seconds
 * @param {String?} duration Duration string format (hh:mm:ss)
 * @returns {Number?} Duration in seconds
 */
function hhmmssToDuration(durationStr) {
  if (!durationStr) {
    return null;
  }

  const parts = durationStr.split(':').map(Number);

  if (parts.some(isNaN)) {
    return null;
  }

  if (parts.length == 3) {
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  } else if (parts.length == 2) {
    return (parts[0] * 60) + parts[1];
  } else if (parts.length == 1) {
    return parts[0];
  }

  return null;
}

/**
 * Get text inside an XML tag
 * @param {String?} xml XML document string
 * @param {String?} tag XML tag to search for
 * @returns {String?} Text inside XML tag
 */
function querySelectorXML(xml, tag) {
	const xmlRegex = new RegExp(`<${tag}>(.*?)<\/${tag}>`, "g");
	const innerText = xmlRegex.exec(xml);
	return innerText?.[1] || null;
}

//#endregion
