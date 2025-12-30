const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store').default;
const ytdl = require('@distube/ytdl-core');
const ytsr = require('youtube-search-api');

const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#0f0f0f',
    title: 'YouTube Client - Ad Free'
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools(); // Remove this in production
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

// IPC Handlers
ipcMain.handle('search-videos', async (event, query) => {
  try {
    const results = await ytsr.GetListByKeyword(query, false, 20);
    return results.items.filter(item => item.type === 'video' || item.type === 'shorts');
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
});

ipcMain.handle('get-video-url', async (event, videoId) => {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Get video info with options to avoid blocks
    const info = await ytdl.getInfo(videoUrl, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      }
    });

    // Get best format with both audio and video
    const formats = info.formats.filter(f => f.hasVideo && f.hasAudio);
    const format = formats.length > 0
      ? ytdl.chooseFormat(formats, { quality: 'highest' })
      : ytdl.chooseFormat(info.formats, { quality: 'highest' });

    console.log('Video format selected:', format.qualityLabel, format.container);

    return {
      url: format.url,
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails[0]?.url,
      duration: info.videoDetails.lengthSeconds,
      uploader: info.videoDetails.author.name,
      description: info.videoDetails.description
    };
  } catch (error) {
    console.error('Video URL error:', error);
    throw error;
  }
});

ipcMain.handle('download-video', async (event, videoId, quality = 'best') => {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdl.getInfo(videoUrl, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    });
    const fs = require('fs');

    const sanitizedTitle = info.videoDetails.title.replace(/[/\\?%*:|"<>]/g, '-');
    const outputPath = path.join(app.getPath('downloads'), `${sanitizedTitle}.mp4`);

    return new Promise((resolve, reject) => {
      const stream = ytdl(videoUrl, {
        quality: 'highestvideo',
        filter: 'audioandvideo',
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        }
      });

      stream.pipe(fs.createWriteStream(outputPath));

      stream.on('finish', () => {
        resolve({ success: true, path: outputPath });
      });

      stream.on('error', (error) => {
        console.error('Download stream error:', error);
        reject({ success: false, error: error.message });
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
