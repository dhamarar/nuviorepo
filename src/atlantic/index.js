import { PROVIDER_NAME } from './constants.js';
import { fetchAphrodite } from './aphrodite.js';
import { fetchArtemis } from './artemis.js';
import { fetchSubtitles } from './subtitles.js';
import { buildStreamTitle, getTmdbMeta, log, mergeSubtitles, qualityBadge, rankQuality } from './utils.js';

/**
 * Atlantic (https://atlantic.st) — a movie-web / P-Stream fork.
 *
 * Surfaces both of the sources the site itself plays:
 *
 *   Aphrodite  https://cdn.hls.lol      primary
 *   Artemis    https://stellar.hls.lol  fallback (fans out to Orbit/Nova/Astra)
 *
 * plus subtitles from the three backends the site queries (Granite, Natsuki,
 * OpenSubtitles).
 *
 * Both sources hand back an **adaptive** HLS master playlist, so quality is not a
 * property of a source — it is a ladder inside its playlist. See `buildStreams`
 * for how that is exposed.
 */

function readSettings() {
    const settings = globalThis.SCRAPER_SETTINGS || {};
    const perLanguage = Number(settings.maxSubtitlesPerLanguage);
    return {
        enableAphrodite: settings.enableAphrodite !== false,
        enableArtemis: settings.enableArtemis !== false,
        enableGranite: settings.enableGranite !== false,
        enableNatsuki: settings.enableNatsuki !== false,
        enableOpenSubtitles: settings.enableOpenSubtitles !== false,
        maxSubtitlesPerLanguage: perLanguage > 0 ? perLanguage : 2,
        maxSubtitlesTotal: 100
    };
}

/** `4K · 1080p` — the ladder, highest first, de-duplicated. */
function qualityLadder(variants) {
    const seen = {};
    const out = [];
    for (let i = 0; i < variants.length; i++) {
        const badge = qualityBadge(variants[i].height);
        if (badge === 'Auto' || seen[badge]) continue;
        seen[badge] = true;
        out.push(badge);
    }
    return out;
}

function subtitleSummary(subtitles) {
    const languages = {};
    for (let i = 0; i < subtitles.length; i++) languages[subtitles[i].language] = true;
    const count = Object.keys(languages).length;
    return count ? '💬 ' + count + ' languages' : '';
}

/**
 * Turn one source descriptor into Nuvio stream entries.
 *
 * Two shapes, decided by whether the master declares a separate audio rendition:
 *
 *  - **Separate audio** (Aphrodite always; Artemis sometimes). Each
 *    `#EXT-X-STREAM-INF` variant is video-only — verified by decrypting an
 *    Aphrodite variant init segment, which holds one `vide` track and no `soun`
 *    track — so a per-quality entry would play silently. A single adaptive entry
 *    is emitted instead, badged with the top resolution and carrying the full
 *    ladder in its title. The player's own quality selector still offers every
 *    rendition, and does so *with* audio.
 *
 *  - **Muxed audio** (Artemis on its TS upstreams). Variants are self-contained,
 *    so each quality is also emitted as its own pickable entry.
 */
function buildStreams(source, meta, season, episode, subtitles) {
    const variants = source.variants || [];
    const top = variants[0];
    const topBadge = top ? qualityBadge(top.height) : 'Auto';
    const ladder = qualityLadder(variants);
    const ladderText = ladder.length ? ladder.join(' · ') : 'Auto';
    const subs = subtitleSummary(subtitles);
    const upstream = source.meta && source.meta.upstream ? ' · ' + source.meta.upstream : '';

    const streams = [{
        name: PROVIDER_NAME + ' | ' + source.label + upstream,
        title: buildStreamTitle(meta, source.label, ladderText, season, episode) +
            '\n🎞 Adaptive HLS · ' + variants.length + ' renditions' +
            (subs ? ' | ' + subs : ''),
        url: source.url,
        quality: topBadge,
        size: topBadge + ' adaptive',
        description: ladderText + (subs ? ' | ' + subs : ''),
        format: 'm3u8',
        headers: source.headers,
        subtitles: subtitles,
        provider: 'atlantic'
    }];

    if (!source.hasSeparateAudio) {
        for (let i = 0; i < variants.length; i++) {
            const variant = variants[i];
            if (!variant.url) continue;
            const badge = qualityBadge(variant.height);
            if (badge === 'Auto') continue;

            streams.push({
                name: PROVIDER_NAME + ' | ' + source.label + ' ' + badge + upstream,
                title: buildStreamTitle(meta, source.label, badge, season, episode) +
                    (subs ? '\n' + subs : ''),
                url: variant.url,
                quality: badge,
                size: badge,
                description: badge + (subs ? ' | ' + subs : ''),
                format: 'm3u8',
                headers: source.headers,
                subtitles: subtitles,
                provider: 'atlantic'
            });
        }
    }

    return streams;
}

export async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        const settings = readSettings();
        const type = mediaType === 'tv' ? 'tv' : 'movie';
        const seasonNumber = type === 'tv' ? Number(season) || 1 : null;
        const episodeNumber = type === 'tv' ? Number(episode) || 1 : null;

        log('--- getStreams tmdb=' + tmdbId + ' type=' + type +
            (type === 'tv' ? ' S' + seasonNumber + 'E' + episodeNumber : '') + ' ---');
        log('settings: aphrodite=' + settings.enableAphrodite + ' artemis=' + settings.enableArtemis +
            ' granite=' + settings.enableGranite + ' natsuki=' + settings.enableNatsuki +
            ' opensubs=' + settings.enableOpenSubtitles +
            ' maxPerLanguage=' + settings.maxSubtitlesPerLanguage);

        const meta = await getTmdbMeta(tmdbId, type);

        const subtitleJob = fetchSubtitles(
            {
                tmdbId: tmdbId,
                mediaType: type,
                season: seasonNumber,
                episode: episodeNumber,
                imdbId: meta.imdbId
            },
            settings
        ).catch(error => {
            log('subtitles failed: ' + error.message);
            return [];
        });

        const aphroditeJob = settings.enableAphrodite
            ? fetchAphrodite(tmdbId, type, seasonNumber, episodeNumber).catch(error => {
                log('aphrodite threw: ' + error.message);
                return null;
            })
            : Promise.resolve(null);

        const artemisJob = settings.enableArtemis
            ? fetchArtemis(tmdbId, type, seasonNumber, episodeNumber).catch(error => {
                log('artemis threw: ' + error.message);
                return null;
            })
            : Promise.resolve(null);

        const results = await Promise.all([aphroditeJob, artemisJob, subtitleJob]);
        const sources = [results[0], results[1]].filter(Boolean);

        if (!sources.length) {
            log('RESULT: 0 streams — no source resolved. If you see network errors above, the ' +
                'device could not reach cdn.hls.lol / stellar.hls.lol.');
            return [];
        }

        const subtitles = mergeSubtitles(
            results[2] || [],
            settings.maxSubtitlesPerLanguage,
            settings.maxSubtitlesTotal
        );

        const streams = [];
        for (let i = 0; i < sources.length; i++) {
            const built = buildStreams(sources[i], meta, seasonNumber, episodeNumber, subtitles);
            for (let j = 0; j < built.length; j++) streams.push(built[j]);
        }

        // Highest quality first. Array.prototype.sort is stable, so a source's
        // adaptive entry stays above its own per-quality entries (same badge).
        streams.sort((a, b) => rankQuality(b.quality) - rankQuality(a.quality));

        log('RESULT: ' + streams.length + ' stream(s) from ' +
            sources.map(source => source.label).join(' + ') +
            ', ' + subtitles.length + ' subtitle track(s)');
        for (let i = 0; i < streams.length; i++) {
            log('  #' + (i + 1) + ' [' + streams[i].quality + '] ' + streams[i].name);
        }

        return streams;
    } catch (error) {
        log('FATAL: ' + (error && error.message ? error.message : error));
        return [];
    }
}

export async function onSettings() {
    return [
        { type: 'header', label: 'Atlantic — Sources' },
        {
            type: 'toggle',
            key: 'enableAphrodite',
            label: 'Aphrodite',
            description: 'Primary source (cdn.hls.lol). Carries 1080p/4K adaptive HLS. Recommended.',
            defaultValue: true
        },
        {
            type: 'toggle',
            key: 'enableArtemis',
            label: 'Artemis',
            description: 'Fallback source (stellar.hls.lol). It picks its own upstream (Orbit/Nova/Astra); when it lands on a broken one, the provider drops it automatically.',
            defaultValue: true
        },
        { type: 'header', label: 'Atlantic — Subtitles' },
        {
            type: 'toggle',
            key: 'enableGranite',
            label: 'Granite',
            description: 'Serves VTT and needs no extra headers, so it is the most likely to just play.',
            defaultValue: true
        },
        {
            type: 'toggle',
            key: 'enableNatsuki',
            label: 'Natsuki',
            description: 'Widest coverage — hundreds of tracks on popular titles. Needs an IMDb id, which the provider resolves from TMDB.',
            defaultValue: true
        },
        {
            type: 'toggle',
            key: 'enableOpenSubtitles',
            label: 'OpenSubtitles',
            description: 'Legacy REST endpoint, serves UTF-8 SRT.',
            defaultValue: true
        },
        {
            type: 'select',
            key: 'maxSubtitlesPerLanguage',
            label: 'Tracks kept per language',
            description: 'These backends can return 600+ tracks for a single episode. Lower this if the subtitle picker feels cluttered.',
            options: [
                { label: '1', value: '1' },
                { label: '2', value: '2' },
                { label: '3', value: '3' },
                { label: '5', value: '5' },
                { label: '10', value: '10' }
            ],
            defaultValue: '2'
        }
    ];
}
