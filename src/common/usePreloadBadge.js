// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const usePreloadedItems = require('./usePreloadedItems');

/**
 * Returns the preload status for a meta item (matched by its stremio `id`,
 * which for IMDB content equals the IMDB ID stored as `imdbId` in
 * `PreloadEntry`).  Returns `null` when no entry exists or `id` is falsy.
 *
 * @param {string|null|undefined} id — the meta item's stremio id (e.g. "tt1234567")
 * @returns {{ status: string, progress?: number } | null}
 */
const usePreloadBadge = (id) => {
    const preloadedItems = usePreloadedItems();

    return React.useMemo(() => {
        if (!id || !preloadedItems?.items) return null;
        // Linear scan — there will typically be ≤5 preload entries at any time.
        const entry = Object.values(preloadedItems.items).find((e) => e.imdbId === id);
        return entry?.status ?? null;
    }, [id, preloadedItems]);
};

module.exports = usePreloadBadge;
