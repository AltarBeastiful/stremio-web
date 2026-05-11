// Copyright (C) 2017-2024 Smart code 203358507

const React = require('react');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { Button, MainNavBars } = require('stremio/components');
const { useCore } = require('stremio/core');
const { withCoreSuspender, usePreloadedItems, useProfile } = require('stremio/common');
const styles = require('./styles');

/**
 * Format bytes as human-readable size string.
 */
function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Format a Date or ISO string as a locale date string.
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (_) {
        return '';
    }
}

const STATUS_LABELS = {
    ready: 'PRELOAD_READY',
    inProgress: 'PRELOAD_IN_PROGRESS',
    pending: 'PRELOAD_PENDING',
    queued: 'PRELOAD_QUEUED',
    failed: 'PRELOAD_FAILED',
};

const DownloadsContent = () => {
    const { t } = useTranslation();
    const core = useCore();
    const profile = useProfile();
    const preloadedItems = usePreloadedItems();
    const [diskSpace, setDiskSpace] = React.useState(null);

    // Fetch disk space on mount
    React.useEffect(() => {
        const serverUrl = profile?.settings?.streamingServerUrl;
        if (typeof serverUrl !== 'string' || serverUrl.length === 0) return;
        fetch(serverUrl.replace(/\/$/, '') + '/preload/disk-space')
            .then((r) => r.ok ? r.json() : null)
            .then(setDiskSpace)
            .catch(() => null);
    }, [profile?.settings?.streamingServerUrl]);

    const items = React.useMemo(() => {
        return Object.values(preloadedItems?.items ?? {})
            .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    }, [preloadedItems]);

    const onCancel = React.useCallback((infoHash) => {
        core.transport.dispatch({
            action: 'Player',
            args: { action: 'CancelPreload', args: { infoHash } }
        });
    }, [core]);

    const onDelete = React.useCallback((infoHash) => {
        core.transport.dispatch({
            action: 'Player',
            args: { action: 'DeletePreload', args: { infoHash } }
        });
    }, [core]);

    return (
        <MainNavBars className={styles['downloads-container']} route={'downloads'}>
            <div className={styles['downloads-content']}>
                <div className={styles['header']}>
                    <span className={styles['header-title']}>{t('DOWNLOADS')}</span>
                    {diskSpace !== null && (
                        <span className={styles['disk-space']}>
                            {t('DOWNLOADS_DISK_AVAILABLE', { available: formatBytes(diskSpace.available) })}
                        </span>
                    )}
                </div>
                {items.length === 0 ? (
                    <div className={styles['empty-state']}>
                        <Icon className={styles['empty-icon']} name={'download'} />
                        <p className={styles['empty-label']}>{t('DOWNLOADS_EMPTY')}</p>
                    </div>
                ) : (
                    <div className={styles['items-list']}>
                        {items.map((entry) => {
                            const status = entry.status?.status ?? 'failed';
                            const progress = Math.round((entry.status?.progress ?? 0) * 100);
                            const speedBps = entry.speedBps ?? 0;
                            const isActive = status === 'inProgress' || status === 'pending' || status === 'queued';
                            const isReady = status === 'ready';
                            const isFailed = status === 'failed';
                            return (
                                <div key={entry.infoHash} className={classnames(styles['download-item'], {
                                    [styles['item-ready']]: isReady,
                                    [styles['item-active']]: isActive,
                                    [styles['item-failed']]: isFailed,
                                })}>
                                    <div className={styles['item-icon-col']}>
                                        {isReady ? (
                                            <Icon className={styles['status-icon']} name={'checkmark'} />
                                        ) : isFailed ? (
                                            <Icon className={styles['status-icon']} name={'close'} />
                                        ) : (
                                            <Icon className={styles['status-icon']} name={'download'} />
                                        )}
                                    </div>
                                    <div className={styles['item-body']}>
                                        <div className={styles['item-title']}>{entry.title || entry.infoHash}</div>
                                        <div className={styles['item-meta']}>
                                            <span className={classnames(styles['item-status'], styles[`status-${status}`])}>
                                                {t(STATUS_LABELS[status] ?? status)}
                                            </span>
                                            {status === 'inProgress' && (
                                                <span className={styles['item-progress']}>
                                                    {` — ${progress}%`}
                                                    {speedBps > 0 && ` (${formatBytes(speedBps)}/s)`}
                                                </span>
                                            )}
                                            <span className={styles['item-date']}>{formatDate(entry.addedAt)}</span>
                                        </div>
                                        {status === 'inProgress' && (
                                            <div className={styles['progress-bar-track']}>
                                                <div className={styles['progress-bar-fill']} style={{ width: `${progress}%` }} />
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles['item-actions']}>
                                        {isActive && (
                                            <Button
                                                className={classnames(styles['action-btn'], styles['action-cancel'])}
                                                title={t('CTX_CANCEL_PRELOAD')}
                                                onClick={() => onCancel(entry.infoHash)}
                                            >
                                                <Icon className={styles['action-icon']} name={'close'} />
                                            </Button>
                                        )}
                                        {(isActive || isReady) && entry.imdbId && (
                                            <Button
                                                className={classnames(styles['action-btn'], styles['action-watch'], {
                                                    [styles['action-watch-partial']]: isActive,
                                                })}
                                                title={t('CTX_PLAY')}
                                                href={`#/metadetails/${entry.contentType || 'movie'}/${entry.imdbId}`}
                                            >
                                                <Icon className={styles['action-icon']} name={'play'} />
                                            </Button>
                                        )}
                                        {isReady && (
                                            <Button
                                                className={classnames(styles['action-btn'], styles['action-delete'])}
                                                title={t('CTX_DELETE_PRELOAD')}
                                                onClick={() => onDelete(entry.infoHash)}
                                            >
                                                <Icon className={styles['action-icon']} name={'remove'} />
                                            </Button>
                                        )}
                                        {isFailed && (
                                            <span className={styles['failed-label']}>{t('PRELOAD_FAILED')}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </MainNavBars>
    );
};

const DownloadsFallback = () => (
    <MainNavBars className={styles['downloads-container']} route={'downloads'} />
);

module.exports = withCoreSuspender(DownloadsContent, DownloadsFallback);
