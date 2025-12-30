const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store').default;
const { exec } = require('child_process');
const { promisify } = require('util');
const ytsr = require('youtube-search-api');

const execAsync = promisify(exec);
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
    console.log('Fetching video:', videoId);

    // Use yt-dlp to get video info and URL
    const { stdout } = await execAsync(
      `yt-dlp -f "best[ext=mp4]/best" --get-url --get-title --get-thumbnail --get-duration --get-description "${videoUrl}"`,
      { maxBuffer: 1024 * 1024 * 10 }
    );

    const lines = stdout.trim().split('\n');

    if (lines.length < 2) {
      throw new Error('Invalid response from yt-dlp');
    }

    // yt-dlp output format: title, url, thumbnail, duration, description
    const [title, url, thumbnail = '', duration = '0', ...descriptionLines] = lines;
    const description = descriptionLines.join('\n');

    console.log('Video fetched successfully:', title);

    return {
      url: url.trim(),
      title: title.trim(),
      thumbnail: thumbnail.trim(),
      duration: duration.trim(),
      uploader: 'YouTube',
      description: description.trim()
    };
  } catch (error) {
    console.error('Video URL error:', error.message);
    console.error('Full error:', error);
    throw new Error(`Failed to load video: ${error.message}`);
  }
});

ipcMain.handle('download-video', async (event, videoId, quality = 'best') => {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Get video title first
    const { stdout: titleOutput } = await execAsync(`yt-dlp --get-title "${videoUrl}"`);
    const sanitizedTitle = titleOutput.trim().replace(/[/\\?%*:|"<>]/g, '-');
    const outputPath = path.join(app.getPath('downloads'), `${sanitizedTitle}.mp4`);

    // Download video using yt-dlp
    await execAsync(
      `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" -o "${outputPath}" "${videoUrl}"`,
      { maxBuffer: 1024 * 1024 * 100 }
    );

    return { success: true, path: outputPath };
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
