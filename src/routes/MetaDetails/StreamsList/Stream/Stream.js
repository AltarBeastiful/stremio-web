// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { t } = require('i18next');
const { useCore } = require('stremio/core');
const { useProfile, usePlatform, useToast, useBinaryState, usePreloadedItems } = require('stremio/common');
const { Button, Image, Popup } = require('stremio/components');
const { useRouteFocused } = require('stremio-router');
const StreamPlaceholder = require('./StreamPlaceholder');
const styles = require('./styles');

const Stream = ({ className, videoId, videoReleased, addonName, name, description, thumbnail, progress, deepLinks, infoHash, fileIdx, title, imdbId, contentTitle, contentType, ...props }) => {
    const profile = useProfile();
    const toast = useToast();
    const platform = usePlatform();
    const core = useCore();
    const routeFocused = useRouteFocused();
    const preloadedItems = usePreloadedItems();

    const preloadEntry = React.useMemo(() => {
        if (typeof infoHash !== 'string') return null;
        return preloadedItems?.items?.[infoHash.toLowerCase()] ?? null;
    }, [infoHash, preloadedItems]);

    const onPreload = React.useCallback((event) => {
        event.preventDefault();
        event.nativeEvent.togglePopupPrevented = true;
        if (typeof infoHash !== 'string') return;

        const dispatchPreload = () => {
            core.transport.dispatch({
                action: 'Player',
                args: {
                    action: 'Preload',
                    args: {
                        infoHash: infoHash.toLowerCase(),
                        fileIdx: typeof fileIdx === 'number' ? fileIdx : 0,
                        imdbId: imdbId ?? '',
                        title: [contentTitle, title ?? name ?? addonName].filter(Boolean).join(' — '),
                        contentType: contentType ?? 'movie',
                    }
                }
            });
        };

        // Preflight: check available disk space before queuing the download.
        // We show a warning if available space < 2 GB, but still proceed.
        const serverUrl = profile.settings.streamingServerUrl;
        if (typeof serverUrl === 'string' && serverUrl.length > 0) {
            const diskSpaceUrl = serverUrl.replace(/\/$/, '') + '/preload/disk-space';
            fetch(diskSpaceUrl)
                .then((r) => r.ok ? r.json() : null)
                .then((data) => {
                    const TWO_GB = 2 * 1024 * 1024 * 1024;
                    if (data && typeof data.available === 'number' && data.available < TWO_GB) {
                        toast.show({
                            type: 'warning',
                            title: t('PRELOAD_DISK_LOW'),
                            timeout: 6000,
                        });
                    }
                })
                .catch(() => { /* ignore — server may not be running yet */ })
                .finally(() => dispatchPreload());
        } else {
            dispatchPreload();
        }
    }, [infoHash, fileIdx, imdbId, title, name, addonName, contentTitle, contentType, profile.settings.streamingServerUrl]);

    const onCancelPreload = React.useCallback((event) => {
        event.preventDefault();
        event.nativeEvent.togglePopupPrevented = true;
        if (typeof infoHash !== 'string') return;
        core.transport.dispatch({
            action: 'Player',
            args: {
                action: 'CancelPreload',
                args: { infoHash: infoHash.toLowerCase() }
            }
        });
    }, [infoHash]);

    const onDeletePreload = React.useCallback((event) => {
        event.preventDefault();
        event.nativeEvent.togglePopupPrevented = true;
        if (typeof infoHash !== 'string') return;
        core.transport.dispatch({
            action: 'Player',
            args: {
                action: 'DeletePreload',
                args: { infoHash: infoHash.toLowerCase() }
            }
        });
    }, [infoHash]);

    const [menuOpen, , closeMenu, toggleMenu] = useBinaryState(false);

    const popupLabelOnMouseUp = React.useCallback((event) => {
        if (!event.nativeEvent.togglePopupPrevented) {
            if (event.nativeEvent.ctrlKey || event.nativeEvent.button === 2) {
                event.preventDefault();
                toggleMenu();
            }
        }
    }, []);
    const popupLabelOnContextMenu = React.useCallback((event) => {
        if (!event.nativeEvent.togglePopupPrevented && !event.nativeEvent.ctrlKey) {
            event.preventDefault();
        }
    }, [toggleMenu]);
    const popupLabelOnLongPress = React.useCallback((event) => {
        if (event.nativeEvent.pointerType !== 'mouse' && !event.nativeEvent.togglePopupPrevented) {
            toggleMenu();
        }
    }, [toggleMenu]);
    const popupMenuOnPointerDown = React.useCallback((event) => {
        event.nativeEvent.togglePopupPrevented = true;
    }, []);
    const popupMenuOnContextMenu = React.useCallback((event) => {
        event.nativeEvent.togglePopupPrevented = true;
    }, []);
    const popupMenuOnClick = React.useCallback((event) => {
        event.nativeEvent.togglePopupPrevented = true;
    }, []);
    const popupMenuOnKeyDown = React.useCallback((event) => {
        event.nativeEvent.buttonClickPrevented = true;
    }, []);

    const href = React.useMemo(() => {
        return deepLinks ?
            deepLinks.externalPlayer ?
                deepLinks.externalPlayer.web ?
                    deepLinks.externalPlayer.web
                    :
                    deepLinks.externalPlayer.openPlayer ?
                        deepLinks.externalPlayer.openPlayer[platform.name] ?
                            deepLinks.externalPlayer.openPlayer[platform.name]
                            :
                            deepLinks.externalPlayer.playlist
                        :
                        deepLinks.player
                :
                deepLinks.player
            :
            null;
    }, [deepLinks]);

    const download = React.useMemo(() => {
        return href === deepLinks?.externalPlayer?.playlist ?
            deepLinks.externalPlayer.fileName
            :
            null;
    }, [href, deepLinks]);

    const target = React.useMemo(() => {
        return href === deepLinks?.externalPlayer?.web ?
            '_blank'
            :
            null;
    }, [href, deepLinks]);

    const streamLink = React.useMemo(() => {
        return deepLinks?.externalPlayer?.streaming;
    }, [deepLinks]);

    const downloadLink = React.useMemo(() => {
        return deepLinks?.externalPlayer?.download;
    }, [deepLinks]);

    const magnetLink = React.useMemo(() => {
        return deepLinks?.externalPlayer?.magnet;
    }, [deepLinks]);

    const markVideoAsWatched = React.useCallback(() => {
        if (typeof videoId === 'string') {
            core.transport.dispatch({
                action: 'MetaDetails',
                args: {
                    action: 'MarkVideoAsWatched',
                    args: [{ id: videoId, released: videoReleased }, true]
                }
            });
        }
    }, [videoId, videoReleased]);

    const onClick = React.useCallback((event) => {
        if (event.nativeEvent.togglePopupPrevented) {
            return;
        }

        if (profile.settings.playerType !== null) {
            markVideoAsWatched();
            toast.show({
                type: 'success',
                title: 'Stream opened in external player',
                timeout: 4000
            });
        }

        if (typeof props.onClick === 'function') {
            props.onClick(event);
        }
    }, [props.onClick, profile.settings, markVideoAsWatched]);

    const copyMagnetLink = React.useCallback((event) => {
        event.preventDefault();
        closeMenu();
        if (magnetLink) {
            navigator.clipboard.writeText(magnetLink)
                .then(() => {
                    toast.show({
                        type: 'success',
                        title: t('PLAYER_COPY_MAGNET_LINK_SUCCESS'),
                        timeout: 4000
                    });
                })
                .catch(() => {
                    toast.show({
                        type: 'error',
                        title: t('PLAYER_COPY_MAGNET_LINK_ERROR'),
                        timeout: 4000,
                    });
                });
        }
    }, [magnetLink]);

    const copyDownloadLink = React.useCallback((event) => {
        event.preventDefault();
        closeMenu();
        if (downloadLink) {
            navigator.clipboard.writeText(downloadLink)
                .then(() => {
                    toast.show({
                        type: 'success',
                        title: t('PLAYER_COPY_DOWNLOAD_LINK_SUCCESS'),
                        timeout: 4000
                    });
                })
                .catch(() => {
                    toast.show({
                        type: 'error',
                        title: t('PLAYER_COPY_DOWNLOAD_LINK_ERROR'),
                        timeout: 4000,
                    });
                });
        }
    }, [downloadLink]);

    const copyStreamLink = React.useCallback((event) => {
        event.preventDefault();
        closeMenu();
        if (streamLink) {
            navigator.clipboard.writeText(streamLink)
                .then(() => {
                    toast.show({
                        type: 'success',
                        title: t('PLAYER_COPY_STREAM_SUCCESS'),
                        timeout: 4000
                    });
                })
                .catch(() => {
                    toast.show({
                        type: 'error',
                        title: t('PLAYER_COPY_STREAM_ERROR'),
                        timeout: 4000,
                    });
                });
        }
    }, [streamLink]);

    const renderThumbnailFallback = React.useCallback(() => (
        <Icon className={styles['placeholder-icon']} name={'ic_broken_link'} />
    ), []);

    const renderLabel = React.useMemo(() => function renderLabel({ className, children, ...props }) {
        const preloadStatus = preloadEntry?.status?.status ?? null;
        const preloadPct = Math.round((preloadEntry?.status?.progress ?? 0) * 100);
        const preloadSpeed = preloadEntry?.speedBps ?? 0;
        const speedLabel = preloadSpeed > 0
            ? ` · ${(preloadSpeed / 1_000_000).toFixed(1)} MB/s`
            : '';
        return (
            <Button className={classnames(className, styles['stream-container'])} title={addonName} href={href} target={target} download={download} onClick={onClick} {...props}>
                <div className={styles['info-container']}>
                    {
                        typeof thumbnail === 'string' && thumbnail.length > 0 ?
                            <div className={styles['thumbnail-container']} title={name || addonName}>
                                <Image
                                    className={styles['thumbnail']}
                                    src={thumbnail}
                                    alt={' '}
                                    renderFallback={renderThumbnailFallback}
                                />
                            </div>
                            :
                            <div className={styles['addon-name-container']} title={name || addonName}>
                                <div className={styles['addon-name']}>{name || addonName}</div>
                            </div>
                    }
                    {
                        progress !== null && !isNaN(progress) && progress > 0 ?
                            <div className={styles['progress-bar-container']}>
                                <div className={styles['progress-bar']} style={{ width: `${progress}%` }} />
                                <div className={styles['progress-bar-background']} />
                            </div>
                            :
                            null
                    }
                </div>
                <div className={styles['description-container']} title={description}>{description}</div>
                {/* Inline preload status bar (full-width row) */}
                {
                    preloadStatus === 'ready' ?
                        <div className={classnames(styles['preload-bar-container'], styles['preload-bar-ready'])}>
                            <div className={styles['preload-bar']} style={{ width: '100%' }} />
                            <div className={styles['preload-bar-background']} />
                            <Icon className={styles['preload-done-icon']} name={'checkmark'} title={t('CTX_DELETE_PRELOAD')} />
                        </div>
                        : preloadStatus === 'inProgress' ?
                            <div className={styles['preload-bar-container']}>
                                <div className={styles['preload-bar']} style={{ width: `${preloadPct}%` }} />
                                <div className={styles['preload-bar-background']} />
                                <span className={styles['preload-bar-label']}>{preloadPct}%{speedLabel}</span>
                            </div>
                            : (preloadStatus === 'pending' || preloadStatus === 'queued') ?
                                <div className={classnames(styles['preload-bar-container'], preloadStatus === 'queued' ? styles['preload-bar-queued'] : null)}>
                                    <div className={styles['preload-bar']} style={{ width: '0%' }} />
                                    <div className={styles['preload-bar-background']} />
                                    <span className={styles['preload-bar-label']}>{t(preloadStatus === 'queued' ? 'PRELOAD_QUEUED' : 'PRELOAD_PENDING')}</span>
                                </div>
                                : preloadStatus === 'failed' ?
                                    <div className={classnames(styles['preload-bar-container'], styles['preload-bar-failed'])}>
                                        <div className={styles['preload-bar-background']} />
                                        <span className={styles['preload-bar-label']}>{t('PRELOAD_FAILED')}</span>
                                    </div>
                                    : null
                }
                {/* Inline preload action button (always visible for torrent streams) */}
                {
                    typeof infoHash === 'string' ?
                        preloadStatus === 'ready' ?
                            <Button
                                className={classnames(styles['preload-btn'], styles['preload-btn-done'])}
                                title={t('CTX_DELETE_PRELOAD')}
                                onClick={onDeletePreload}
                            >
                                <Icon className={styles['preload-btn-icon']} name={'checkmark'} />
                            </Button>
                            : (preloadStatus === 'inProgress' || preloadStatus === 'pending' || preloadStatus === 'queued') ?
                                <Button
                                    className={classnames(styles['preload-btn'], styles['preload-btn-active'], preloadStatus === 'queued' ? styles['preload-btn-queued'] : null)}
                                    title={t('CTX_CANCEL_PRELOAD')}
                                    onClick={onCancelPreload}
                                >
                                    <Icon className={styles['preload-btn-icon']} name={'close'} />
                                </Button>
                                :
                                <Button
                                    className={classnames(styles['preload-btn'], styles['preload-btn-idle'])}
                                    title={t('CTX_PRELOAD')}
                                    onClick={onPreload}
                                >
                                    <Icon className={styles['preload-btn-icon']} name={'download'} />
                                </Button>
                        : null
                }
                <Icon className={styles['icon']} name={'play'} />
                {children}
            </Button>
        );
    }, [thumbnail, progress, addonName, name, description, href, target, download, onClick, infoHash, preloadEntry, onPreload, onCancelPreload, onDeletePreload]);

    const renderMenu = React.useMemo(() => function renderMenu() {
        return (
            <div className={styles['context-menu-content']} onPointerDown={popupMenuOnPointerDown} onContextMenu={popupMenuOnContextMenu} onClick={popupMenuOnClick} onKeyDown={popupMenuOnKeyDown}>
                <div className={styles['context-menu-title']}>
                    {description}
                </div>
                <Button className={styles['context-menu-option-container']} title={t('CTX_PLAY')}>
                    <Icon className={styles['menu-icon']} name={'play'} />
                    <div className={styles['context-menu-option-label']}>{t('CTX_PLAY')}</div>
                </Button>
                {
                    streamLink &&
                        <Button className={styles['context-menu-option-container']} title={t('CTX_COPY_STREAM_LINK')} onClick={copyStreamLink}>
                            <Icon className={styles['menu-icon']} name={'link'} />
                            <div className={styles['context-menu-option-label']}>{t('CTX_COPY_STREAM_LINK')}</div>
                        </Button>
                }
                {
                    magnetLink &&
                        <Button className={styles['context-menu-option-container']} title={t('CTX_COPY_MAGNET_LINK')} onClick={copyMagnetLink}>
                            <Icon className={styles['menu-icon']} name={'magnet-link'} />
                            <div className={styles['context-menu-option-label']}>{t('CTX_COPY_MAGNET_LINK')}</div>
                        </Button>
                }
                {
                    downloadLink &&
                        <Button className={styles['context-menu-option-container']} title={t('CTX_DOWNLOAD_VIDEO')} onClick={copyDownloadLink}>
                            <Icon className={styles['menu-icon']} name={'download'} />
                            <div className={styles['context-menu-option-label']}>{t('CTX_COPY_VIDEO_DOWNLOAD_LINK')}</div>
                        </Button>
                }
                {
                    typeof infoHash === 'string' && (!preloadEntry || preloadEntry.status?.status === 'failed') ?
                        <Button className={styles['context-menu-option-container']} title={t('CTX_PRELOAD')} onClick={onPreload}>
                            <Icon className={styles['menu-icon']} name={'download'} />
                            <div className={styles['context-menu-option-label']}>{t('CTX_PRELOAD')}</div>
                        </Button>
                        : null
                }
                {
                    preloadEntry && (preloadEntry.status?.status === 'queued' || preloadEntry.status?.status === 'pending' || preloadEntry.status?.status === 'inProgress') ?
                        <Button className={styles['context-menu-option-container']} title={t('CTX_CANCEL_PRELOAD')} onClick={onCancelPreload}>
                            <Icon className={styles['menu-icon']} name={'close'} />
                            <div className={styles['context-menu-option-label']}>
                                {t('CTX_CANCEL_PRELOAD')}
                                {preloadEntry.status?.status === 'inProgress' ? ` (${Math.round((preloadEntry.status.progress ?? 0) * 100)}%)` : ''}
                                {preloadEntry.status?.status === 'queued' ? ' (queued)' : ''}
                            </div>
                        </Button>
                        : null
                }
                {
                    preloadEntry && (preloadEntry.status?.status === 'inProgress' || preloadEntry.status?.status === 'ready') ?
                        <Button className={styles['context-menu-option-container']} title={t('CTX_DELETE_PRELOAD')} onClick={onDeletePreload}>
                            <Icon className={styles['menu-icon']} name={'ic_remove'} />
                            <div className={styles['context-menu-option-label']}>{t('CTX_DELETE_PRELOAD')}</div>
                        </Button>
                        : null
                }
            </div>
        );
    }, [copyStreamLink, copyMagnetLink, copyDownloadLink, onClick, infoHash, fileIdx, preloadEntry, onPreload, onCancelPreload, onDeletePreload]);

    React.useEffect(() => {
        if (!routeFocused) {
            closeMenu();
        }
    }, [routeFocused]);

    return (
        <Popup
            className={className}
            onMouseUp={popupLabelOnMouseUp}
            onLongPress={popupLabelOnLongPress}
            onContextMenu={popupLabelOnContextMenu}
            open={menuOpen}
            onCloseRequest={closeMenu}
            renderLabel={renderLabel}
            renderMenu={renderMenu}
        />
    );
};

Stream.Placeholder = StreamPlaceholder;

Stream.propTypes = {
    className: PropTypes.string,
    videoId: PropTypes.string,
    videoReleased: PropTypes.instanceOf(Date),
    addonName: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
    thumbnail: PropTypes.string,
    progress: PropTypes.number,
    infoHash: PropTypes.string,
    fileIdx: PropTypes.number,
    title: PropTypes.string,
    imdbId: PropTypes.string,
    deepLinks: PropTypes.shape({
        player: PropTypes.string,
        externalPlayer: PropTypes.shape({
            download: PropTypes.string,
            magnet: PropTypes.string,
            streaming: PropTypes.string,
            playlist: PropTypes.string,
            fileName: PropTypes.string,
            web: PropTypes.string,
            openPlayer: PropTypes.shape({
                ios: PropTypes.string,
                android: PropTypes.string,
                windows: PropTypes.string,
                macos: PropTypes.string,
                linux: PropTypes.string,
            })
        })
    }),
    onClick: PropTypes.func
};

module.exports = Stream;
