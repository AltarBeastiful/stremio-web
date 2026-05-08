// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useCore } = require('stremio/core');

/**
 * Polls in-progress preload tasks every 3 seconds so the core model
 * receives updated progress via Internal::PreloadProgress messages.
 *
 * Mounted once near the root (App.js) — above the Router — so it must
 * NOT use useModelState / usePreloadedItems because those gate on
 * routeFocused, which is always false outside a Route context.
 * Instead we subscribe to core state events directly.
 */
const usePreloadPolling = () => {
    const core = useCore();

    // items is a plain object keyed by infoHash, mirroring PreloadedItems.items
    const [items, setItems] = React.useState({});

    // Subscribe directly to core state events — no routeFocused gate.
    React.useEffect(() => {
        let cancelled = false;

        const refresh = async () => {
            try {
                const state = await core.transport.getState('preloaded_items');
                if (!cancelled) setItems(state?.items ?? {});
            } catch (_) {
                // getState failure is non-fatal; keep previous items
            }
        };

        const onNewState = (models) => {
            if (models.includes('preloaded_items')) refresh();
        };

        core.on('state', onNewState);
        refresh(); // seed with current state immediately

        return () => {
            cancelled = true;
            core.off('state', onNewState);
        };
    }, [core]);

    // Compute the list of info-hashes that still need polling
    const activeInfoHashes = React.useMemo(() => {
        return Object.values(items)
            .filter((e) => e.status?.status === 'pending' || e.status?.status === 'inProgress')
            .map((e) => e.infoHash);
    }, [items]);

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

        poll(); // fire immediately so first response arrives within 1 request
        const interval = setInterval(poll, 3000);
        return () => clearInterval(interval);
    }, [activeInfoHashes, core]);
};

module.exports = usePreloadPolling;
