const { contextBridge, ipcRenderer } = require('electron');

// Input validation in preload for additional security layer
function validateVideoId(videoId) {
  return typeof videoId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

function validateSearchQuery(query) {
  return typeof query === 'string' && query.length > 0 && query.length <= 200;
}

contextBridge.exposeInMainWorld('api', {
  searchVideos: (query) => {
    if (!validateSearchQuery(query)) {
      return Promise.reject(new Error('Invalid search query'));
    }
    return ipcRenderer.invoke('search-videos', query);
  },
  getVideoUrl: (videoId) => {
    if (!validateVideoId(videoId)) {
      return Promise.reject(new Error('Invalid video ID'));
    }
    return ipcRenderer.invoke('get-video-url', videoId);
  },
  downloadVideo: (videoId, quality) => {
    if (!validateVideoId(videoId)) {
      return Promise.reject(new Error('Invalid video ID'));
    }
    return ipcRenderer.invoke('download-video', videoId, quality);
  },
  getSubscriptions: () => ipcRenderer.invoke('get-subscriptions'),
  addSubscription: (channel) => ipcRenderer.invoke('add-subscription', channel),
  removeSubscription: (channelId) => ipcRenderer.invoke('remove-subscription', channelId),
  getChannelVideos: (channelId) => ipcRenderer.invoke('get-channel-videos', channelId)
});
