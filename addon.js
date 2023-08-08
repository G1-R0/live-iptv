const { addonBuilder } = require("stremio-addon-sdk")
const axios = require('axios');

const channelsURL = 'https://iptv-org.github.io/api/channels.json';
const streamsURL = 'https://iptv-org.github.io/api/streams.json';

// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest = {
	id: "community.liveiptv",
	version: "0.0.1",
	catalogs: [
		{
			type: "channel",
			id: "top",
			extra: [
				{ name: "search", isRequired: false },
				{
					name: "genre",
					options: [
						'undefined', 'auto', 'animation', 'business', 'classic', 'comedy', 'cooking', 'culture', 'documentary', 'education', 'entertainment', 'family', 'general', 'kids', 'legislative', 'lifestyle', 'movies', 'music', 'news', 'outdoor', 'relax', 'religious', 'series', 'science', 'shop', 'sports', 'travel', 'weather', 'xxx'
					]
				},
			],
		}
	],
	resources: ["catalog", "stream", "meta"],
	types: ["channel"],
	name: "live-iptv",
	description: "Collection of publicly available IPTV channels from all over the world.",
	behaviorHints: [{ configurable: true, configurationRequired: false }],
	config: [
		{ key: 'countries', type: 'checkbox', options: ['BE', 'NL', 'UK', 'US', 'FR', 'IT'], label: 'Select Countries' },
		{ key: 'languages', type: 'checkbox', options: ['nld', 'eng', 'fra', 'ita'], label: 'Select Languages' },
		{ key: 'categories', type: 'checkbox', options: ['general', 'news', 'music', 'xxx'], label: 'Select Categories' },
	],
	icon: "https://dl.strem.io/addon-logo.png",
	logo: "https://dl.strem.io/addon-logo.png",
	background: "https://dl.strem.io/addon-background.jpg",
	contactEmail: 'gilles@rousseaux.dev',
}

const builder = new addonBuilder(manifest);

const getData = async (link) => {
	const response = await axios.get(link);
	return response.data;
};

const getFilteredChannels = async (config = {}, extra = {}) => {
	const channels = await getData(channelsURL);
	const streams = await getData(streamsURL);

	const excludedCategories = config.genre || [];
	const selectedCountries = config.countries || [];
	const selectedLanguages = extra.languages || [];
	const selectedCategories = extra.genre ? [extra.genre] : [];

	return channels.filter(channel => {
		const country = channel.country || '';
		const languages = channel.languages || [];
		const categories = channel.categories && channel.categories.length > 0 ? channel.categories : ['undefined'];

		return (selectedCountries.length === 0 || selectedCountries.includes(country)) &&
			(selectedLanguages.length === 0 || languages.some(lang => selectedLanguages.includes(lang))) &&
			(selectedCategories.length === 0 || categories.some(cat => selectedCategories.includes(cat))) &&
			(excludedCategories.length === 0 || !categories.some(cat => excludedCategories.includes(cat))) &&
			streams.some((stream) => stream.channel === channel.id);
	});
}

builder.defineCatalogHandler(async ({ type, id, extra, config }) => {
	console.log("request for catalogs: " + type + " " + id);

	const filteredChannels = await getFilteredChannels(config, extra);
	const metas = filteredChannels.map(channel => {
		return {
			id: channel.id,
			name: channel.name,
			type: 'channel',
			poster: channel.logo,
			background: channel.logo,
			genres: channel.categories,
			logo: channel.logo,
		}
	})

	return Promise.resolve({ metas })
})

builder.defineMetaHandler(async ({ type, id }) => {
	console.log("request for meta: " + type + " " + id)
	// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/requests/defineMetaHandler.md
	const channels = await getData(channelsURL);
	const channel = channels.find(channel => channel.id === id);

	return Promise.resolve({
		meta: {
			type: 'channel',
			id: channel.id,
			name: channel.name,
			genres: channel.categories,
			poster: channel.logo,
			background: channel.logo,
			logo: channel.logo,
			description: `Country: ${channel.country}, Languages: ${channel.languages.join(', ')}, Categories: ${channel.categories.join(', ')}`,
		}
	})
})

builder.defineStreamHandler(async ({ type, id, name }) => {
	console.log("request for streams: " + type + " " + id)
	// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/requests/defineStreamHandler.md
	const streams = await getData(streamsURL);
	const stream = streams.find((stream) => stream.channel === id)

	return Promise.resolve({
		streams: [{
			url: name,
			title: stream.channel + ' live iptv stream',
		}]
	})
})

module.exports = builder.getInterface()
