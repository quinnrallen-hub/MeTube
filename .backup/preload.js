const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  searchVideos: (query) => ipcRenderer.invoke('search-videos', query),
  getVideoUrl: (videoId) => ipcRenderer.invoke('get-video-url', videoId),
  downloadVideo: (videoId, quality) => ipcRenderer.invoke('download-video', videoId, quality),
  getSubscriptions: () => ipcRenderer.invoke('get-subscriptions'),
  addSubscription: (channel) => ipcRenderer.invoke('add-subscription', channel),
  removeSubscription: (channelId) => ipcRenderer.invoke('remove-subscription', channelId),
  getChannelVideos: (channelId) => ipcRenderer.invoke('get-channel-videos', channelId)
});
