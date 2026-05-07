// Copyright (C) 2017-2023 Smart code 203358507

const useModelState = require('stremio/common/useModelState');

const usePreloadedItems = () => {
    return useModelState({ model: 'preloaded_items' });
};

module.exports = usePreloadedItems;
