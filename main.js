const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store').default;
const ytdl = require('@distube/ytdl-core');
const ytsr = require('youtube-search-api');
const fs = require('fs');

const store = new Store();

// Video URL cache to prevent refetching
const videoCache = new Map();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#0f0f0f',
    title: 'MeTube - Better YouTube'
  });

  mainWindow.loadFile('index.html');

  // Only open dev tools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Input validation helpers
function validateVideoId(videoId) {
  if (typeof videoId !== 'string') return false;
  // YouTube video IDs are 11 characters, alphanumeric with - and _
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

function validateSearchQuery(query) {
  if (typeof query !== 'string') return false;
  // Max 200 characters, prevent injection
  return query.length > 0 && query.length <= 200;
}

function sanitizeFilename(filename) {
  // Remove all path traversal patterns and dangerous characters
  return filename
    .replace(/\.\./g, '') // Remove ..
    .replace(/[/\\?%*:|"<>]/g, '-') // Remove path separators and special chars
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 200); // Limit length
}

// IPC Handlers
ipcMain.handle('search-videos', async (event, query) => {
  try {
    // Validate input
    if (!validateSearchQuery(query)) {
      console.error('Invalid search query');
      return [];
    }

    const results = await ytsr.GetListByKeyword(query, false, 20);
    return results.items.filter(item => item.type === 'video' || item.type === 'shorts');
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
});

ipcMain.handle('get-video-url', async (event, videoId) => {
  try {
    // Validate video ID to prevent injection
    if (!validateVideoId(videoId)) {
      throw new Error('Invalid video ID format');
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log('Fetching video:', videoId);

    // Check cache first
    const cached = videoCache.get(videoId);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      console.log('Returning cached video data');
      return cached.data;
    }

    // Use ytdl-core instead of exec (NO COMMAND INJECTION!)
    const info = await ytdl.getInfo(videoUrl);

    // Get the best format with both audio and video
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: format => format.hasVideo && format.hasAudio
    });

    if (!format || !format.url) {
      throw new Error('No suitable video format found');
    }

    const videoData = {
      url: format.url,
      title: info.videoDetails.title || 'Unknown Title',
      thumbnail: info.videoDetails.thumbnails?.[0]?.url || '',
      duration: info.videoDetails.lengthSeconds || '0',
      uploader: info.videoDetails.author?.name || 'YouTube',
      description: info.videoDetails.description || ''
    };

    // Cache the result
    videoCache.set(videoId, {
      data: videoData,
      timestamp: Date.now()
    });

    console.log('Video fetched successfully:', videoData.title);

    return videoData;
  } catch (error) {
    console.error('Video URL error:', error.message);
    throw new Error(`Failed to load video: ${error.message}`);
  }
});

ipcMain.handle('download-video', async (event, videoId, quality = 'best') => {
  try {
    // Validate video ID
    if (!validateVideoId(videoId)) {
      throw new Error('Invalid video ID format');
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Get video info using ytdl-core (NO EXEC!)
    const info = await ytdl.getInfo(videoUrl);
    const title = info.videoDetails.title || 'video';

    // Properly sanitize filename to prevent path traversal
    const sanitizedTitle = sanitizeFilename(title);
    const outputPath = path.join(app.getPath('downloads'), `${sanitizedTitle}.mp4`);

    // Ensure we're not writing outside downloads directory
    const downloadsDir = app.getPath('downloads');
    const resolvedPath = path.resolve(outputPath);
    if (!resolvedPath.startsWith(downloadsDir)) {
      throw new Error('Invalid output path');
    }

    // Download video stream
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });
    const stream = ytdl.downloadFromInfo(info, { format });
    const writeStream = fs.createWriteStream(outputPath);

    return new Promise((resolve, reject) => {
      stream.pipe(writeStream);

      writeStream.on('finish', () => {
        resolve({ success: true, path: outputPath });
      });

      stream.on('error', (error) => {
        console.error('Download stream error:', error);
        reject(new Error(`Download failed: ${error.message}`));
      });

      writeStream.on('error', (error) => {
        console.error('Write stream error:', error);
        reject(new Error(`File write failed: ${error.message}`));
      });
    });
  } catch (error) {
    console.error('Download error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-subscriptions', async () => {
  return store.get('subscriptions', []);
});

ipcMain.handle('add-subscription', async (event, channel) => {
  const subscriptions = store.get('subscriptions', []);
  if (!subscriptions.find(sub => sub.id === channel.id)) {
    subscriptions.push(channel);
    store.set('subscriptions', subscriptions);
  }
  return subscriptions;
});

ipcMain.handle('remove-subscription', async (event, channelId) => {
  const subscriptions = store.get('subscriptions', []);
  const filtered = subscriptions.filter(sub => sub.id !== channelId);
  store.set('subscriptions', filtered);
  return filtered;
});

ipcMain.handle('get-channel-videos', async (event, channelId) => {
  try {
    const results = await ytsr.GetPlaylistData(channelId);
    return results.items || [];
  } catch (error) {
    console.error('Channel videos error:', error);
    return [];
  }
});
