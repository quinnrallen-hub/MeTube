# MeTube - Better YouTube

A full-featured desktop YouTube client with no ads, enhanced privacy, and better features. Built with Electron and Node.js.

## Features

### Video Playback
- **100% Ad-Free** - No advertisements, ever
- **Picture-in-Picture Mode** - Watch while working
- **Quality Selector** - Choose your preferred video quality
- **Full Player Controls** - Play, pause, seek, volume, fullscreen

### Content Discovery
- **Smart Search** - Find any video quickly
- **Trending Section** - See what's popular
- **YouTube Shorts** - Dedicated Shorts viewer
- **Home Feed** - Popular and recommended videos

### Personalization
- **Watch History** - Track all watched videos
- **Playlists** - Create and manage playlists (Watch Later)
- **Subscriptions** - Follow your favorite channels
- **Like Videos** - Save your favorites
- **Light/Dark Theme** - Toggle between themes

### Privacy & Data
- **All Data Stored Locally** - Complete privacy
- **No Account Required** - Use YouTube without logging in
- **No Tracking** - Zero telemetry or analytics

### Advanced Features
- **Video Downloads** - Save videos for offline viewing
- **Tabbed Interface** - Description and comments tabs
- **Modern UI** - Clean, YouTube-inspired design
- **Keyboard Shortcuts** - Efficient navigation

## Installation

### Arch Linux (AUR)

Install from the AUR using your favorite AUR helper:

```bash
yay -S metube-git
# or
paru -S metube-git
```

### One-Line Install (Any Linux)

Install MeTube with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/quinnrallen-hub/MeTube/main/quick-install.sh | bash
```

This will automatically:
- Download the source code
- Install dependencies
- Build the application
- Install to your system (creates `metube` command)
- Create a desktop shortcut

After installation, launch **MeTube** from your application menu or run `metube` in the terminal.

### Manual Install (Linux)

If you prefer to install manually:

```bash
# 1. Clone the repository
git clone https://github.com/quinnrallen-hub/MeTube.git
cd MeTube

# 2. Install dependencies
npm install

# 3. Build the application
npm run build:linux

# 4. Install to your system (creates desktop shortcut)
npm run install-app
```

After installation, you can launch MeTube from your application menu or by running `metube` in the terminal.

### Uninstall

```bash
npm run uninstall-app
```

### Development Setup

If you want to run from source for development:

```bash
# Install dependencies
npm install

# Run the app
npm start
```

## Usage

### Starting the Application

```bash
npm start
```

This will launch the YouTube Ad-Free Client window.

### Features Overview

#### Search for Videos
1. Type your search query in the search bar at the top
2. Press Enter or click the Search button
3. Browse through the results and click any video to watch

#### Watch Videos
- Click any video thumbnail to start playback
- Videos play in high quality without ads
- Use the built-in video controls (play, pause, volume, fullscreen)

#### Download Videos
1. While watching a video, click the "Download" button
2. The video will be saved to your Downloads folder
3. You'll get a confirmation when the download is complete

#### Subscriptions
1. Navigate to the Subscriptions view using the sidebar
2. Your subscribed channels will appear here
3. Subscriptions are stored locally on your machine

#### YouTube Shorts
- Click "Shorts" in the sidebar to browse YouTube Shorts
- Shorts are displayed in a vertical format
- Watch them just like regular videos

### Keyboard Shortcuts
- **Enter** - Submit search query
- **Space** - Play/Pause video (when player is focused)
- **F** - Fullscreen (when player is focused)

## Building for Distribution

Create distributable packages for different platforms:

### Linux
```bash
npm run build:linux
```
Creates AppImage and .deb packages in the `dist/` folder

### Windows
```bash
npm run build:win
```
Creates NSIS installer and portable executable in the `dist/` folder

### macOS
```bash
npm run build:mac
```
Creates .dmg installer in the `dist/` folder

### All Platforms
```bash
npm run build
```

## Technical Details

### Technologies Used
- **Electron** - Desktop application framework
- **ytdl-core** - YouTube video fetching and streaming
- **youtube-search-api** - Search functionality
- **electron-store** - Local data persistence
- **HTML/CSS/JavaScript** - Frontend interface

### How Ad-Blocking Works
The application fetches video streams directly from YouTube's servers using ytdl-core, which:
1. Extracts the direct video URL
2. Streams the video content without requesting ad content
3. Provides the cleanest video stream available

This approach bypasses YouTube's ad injection entirely rather than blocking ads after they've loaded.

## Privacy & Data

- All data is stored locally on your machine
- No telemetry or tracking
- Subscriptions and preferences are saved using electron-store
- No account login required (uses YouTube's public API)

## Troubleshooting

### App won't start
- Make sure all dependencies are installed: `npm install`
- Check that Node.js and npm are up to date

### Videos won't play
- Some videos may be region-restricted or age-restricted
- Try a different video
- Check your internet connection

### Search not working
- Verify your internet connection
- The YouTube API may occasionally be slow - try again

### Downloads fail
- Check that you have write permissions to your Downloads folder
- Ensure you have enough disk space
- Some videos may have download restrictions

## Notes

- This application is for personal use only
- Respect content creators by supporting them when possible
- Some features may break if YouTube changes their API

## License

MIT License - Feel free to modify and distribute

## Support

If you encounter issues:
1. Check the console output when running with `npm start`
2. Look for error messages in the developer tools (enabled by default)
3. Make sure you're using the latest version of Node.js

Enjoy ad-free YouTube watching!
