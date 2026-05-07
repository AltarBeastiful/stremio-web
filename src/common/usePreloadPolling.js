// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useCore } = require('stremio/core');
const usePreloadedItems = require('./usePreloadedItems');

/**
 * Polls in-progress preload tasks every 3 seconds so the core model
 * receives updated progress via Internal::PreloadProgress messages.
 *
 * Mount this hook once near the root so polling works across routes.
 */
const usePreloadPolling = () => {
    const core = useCore();
    const preloadedItems = usePreloadedItems();

    const activeInfoHashes = React.useMemo(() => {
        if (!preloadedItems?.items) return [];
        return Object.values(preloadedItems.items)
            .filter((e) => e.status?.status === 'Pending' || e.status?.status === 'InProgress')
            .map((e) => e.infoHash);
    }, [preloadedItems]);

    React.useEffect(() => {
        if (activeInfoHashes.length === 0) return;

        const poll = () => {
            activeInfoHashes.forEach((infoHash) => {
                core.transport.dispatch({
                    action: 'Player',
                    args: {
                        action: 'PollPreload',
                        args: { infoHash }
                    }
                });
            });
        };

        poll();
        const interval = setInterval(poll, 3000);
        return () => clearInterval(interval);
    }, [activeInfoHashes]);
};

module.exports = usePreloadPolling;
