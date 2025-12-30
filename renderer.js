// State management
let currentView = 'home';
let currentVideo = null;
let searchResults = [];
let subscriptions = [];
let playlists = [];
let watchHistory = [];
let likedVideos = new Set();
let theme = 'dark';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsGrid = document.getElementById('resultsGrid');
const sectionTitle = document.getElementById('sectionTitle');
const videoPlayer = document.getElementById('videoPlayer');
const videoElement = document.getElementById('videoElement');
const videoTitle = document.getElementById('videoTitle');
const videoUploader = document.getElementById('videoUploader');
const videoDescription = document.getElementById('videoDescription');
const commentsSection = document.getElementById('commentsSection');
const downloadBtn = document.getElementById('downloadBtn');
const backBtn = document.getElementById('backBtn');
const loading = document.getElementById('loading');
const resultsContainer = document.getElementById('resultsContainer');
const themeToggle = document.getElementById('themeToggle');
const pipBtn = document.getElementById('pipBtn');
const qualitySelector = document.getElementById('qualitySelector');
const likeBtn = document.getElementById('likeBtn');
const subscribeBtn = document.getElementById('subscribeBtn');
const addToPlaylistBtn = document.getElementById('addToPlaylistBtn');

// Tab elements
const tabs = document.querySelectorAll('.tab');
const tabPanels = document.querySelectorAll('.tab-panel');

// Event Listeners
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') performSearch();
});

backBtn.addEventListener('click', () => {
  videoPlayer.classList.add('hidden');
  resultsContainer.classList.remove('hidden');
  videoElement.pause();
  videoElement.src = '';
});

downloadBtn.addEventListener('click', async () => {
  if (!currentVideo) return;

  showLoading();
  const result = await window.api.downloadVideo(currentVideo.id);
  hideLoading();

  if (result.success) {
    showNotification('Video downloaded successfully!');
  } else {
    showNotification('Download failed: ' + result.error, 'error');
  }
});

// Theme toggle
themeToggle.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
});

// Picture-in-Picture
pipBtn.addEventListener('click', async () => {
  if (!document.pictureInPictureElement) {
    try {
      await videoElement.requestPictureInPicture();
    } catch (error) {
      console.error('PiP error:', error);
    }
  } else {
    await document.exitPictureInPicture();
  }
});

// Like button
likeBtn.addEventListener('click', () => {
  if (!currentVideo) return;

  if (likedVideos.has(currentVideo.id)) {
    likedVideos.delete(currentVideo.id);
    likeBtn.classList.remove('liked');
  } else {
    likedVideos.add(currentVideo.id);
    likeBtn.classList.add('liked');
  }

  saveLikedVideos();
  updateLikeButton();
});

// Subscribe button
subscribeBtn.addEventListener('click', async () => {
  if (!currentVideo) return;

  const channel = {
    id: currentVideo.channelId || currentVideo.uploader,
    name: currentVideo.uploader
  };

  const isSubscribed = subscriptions.find(sub => sub.id === channel.id);

  if (isSubscribed) {
    await window.api.removeSubscription(channel.id);
    subscriptions = subscriptions.filter(sub => sub.id !== channel.id);
    subscribeBtn.textContent = 'Subscribe';
    subscribeBtn.classList.remove('subscribed');
  } else {
    subscriptions = await window.api.addSubscription(channel);
    subscribeBtn.textContent = 'Subscribed';
    subscribeBtn.classList.add('subscribed');
  }
});

// Add to playlist
addToPlaylistBtn.addEventListener('click', () => {
  if (!currentVideo) return;

  // Simple implementation - add to "Watch Later" playlist
  let watchLater = playlists.find(p => p.name === 'Watch Later');
  if (!watchLater) {
    watchLater = { name: 'Watch Later', videos: [] };
    playlists.push(watchLater);
  }

  if (!watchLater.videos.find(v => v.id === currentVideo.id)) {
    watchLater.videos.push({
      id: currentVideo.id,
      title: currentVideo.title,
      thumbnail: currentVideo.thumbnail
    });
    savePlaylists();
    showNotification('Added to Watch Later');
  } else {
    showNotification('Already in Watch Later');
  }
});

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const view = item.getAttribute('data-view');
    switchView(view);
  });
});

// Tab switching
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.getAttribute('data-tab');

    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    tabPanels.forEach(panel => panel.classList.add('hidden'));
    document.getElementById(tabName + 'Tab').classList.remove('hidden');

    // Load comments when comments tab is clicked
    if (tabName === 'comments' && currentVideo) {
      loadComments(currentVideo.id);
    }
  });
});

// Functions
async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  showLoading();
  resultsContainer.classList.remove('hidden');
  videoPlayer.classList.add('hidden');

  try {
    searchResults = await window.api.searchVideos(query);
    sectionTitle.textContent = `Search results for "${query}"`;
    displayResults(searchResults);
  } catch (error) {
    console.error('Search error:', error);
    resultsGrid.innerHTML = '<p class="error">Search failed. Please try again.</p>';
  }

  hideLoading();
}

function displayResults(results) {
  resultsGrid.innerHTML = '';

  if (!results || results.length === 0) {
    resultsGrid.innerHTML = '<p class="no-results">No results found</p>';
    return;
  }

  results.forEach(item => {
    const videoCard = createVideoCard(item);
    resultsGrid.appendChild(videoCard);
  });
}

function createVideoCard(item) {
  const card = document.createElement('div');
  card.className = 'video-card';

  const isShort = item.type === 'shorts' || (item.length && item.length.simpleText &&
    (item.length.simpleText.includes(':') && parseInt(item.length.simpleText.split(':')[0]) === 0));

  const thumbnail = item.thumbnail?.thumbnails?.[0]?.url || '';
  const title = item.title || 'Untitled';
  const channelName = item.channelTitle || item.channelName || 'Unknown';
  const duration = item.length?.simpleText || item.lengthText || '';
  const videoId = item.id;

  // Extract views and publish date
  const views = item.viewCount?.text || item.viewCountText || '';
  const publishedTime = item.publishedTimeText || item.publishTime || '';

  card.innerHTML = `
    <div class="thumbnail-container ${isShort ? 'short-thumbnail' : ''}">
      <img src="${thumbnail}" alt="${title}" class="thumbnail" loading="lazy">
      ${duration ? `<span class="duration">${duration}</span>` : ''}
      ${isShort ? '<span class="short-badge">Short</span>' : ''}
    </div>
    <div class="video-info-card">
      <h3 class="video-title-card">${escapeHtml(title)}</h3>
      <p class="channel-name">${escapeHtml(channelName)}</p>
      <div class="video-metadata">
        ${views ? `<span class="views">${views}</span>` : ''}
        ${views && publishedTime ? '<span class="separator">•</span>' : ''}
        ${publishedTime ? `<span class="published-time">${publishedTime}</span>` : ''}
      </div>
    </div>
  `;

  card.addEventListener('click', () => playVideo(videoId, item));

  return card;
}

async function playVideo(videoId, videoInfo) {
  showLoading();
  resultsContainer.classList.add('hidden');

  try {
    const videoData = await window.api.getVideoUrl(videoId);
    currentVideo = { id: videoId, ...videoData, ...videoInfo };

    videoElement.src = videoData.url;
    videoTitle.textContent = videoData.title;
    videoUploader.textContent = videoData.uploader;

    // Load description (using available data)
    videoDescription.innerHTML = videoData.description ||
      `<p><strong>Title:</strong> ${escapeHtml(videoData.title)}</p>
       <p><strong>Uploader:</strong> ${escapeHtml(videoData.uploader)}</p>
       <p><strong>Duration:</strong> ${formatDuration(videoData.duration)}</p>`;

    // Update like button state
    updateLikeButton();

    // Update subscribe button
    const isSubscribed = subscriptions.find(sub =>
      sub.id === currentVideo.channelId || sub.name === currentVideo.uploader
    );
    if (isSubscribed) {
      subscribeBtn.textContent = 'Subscribed';
      subscribeBtn.classList.add('subscribed');
    } else {
      subscribeBtn.textContent = 'Subscribe';
      subscribeBtn.classList.remove('subscribed');
    }

    videoPlayer.classList.remove('hidden');
    videoElement.play();

    // Add to history
    addToHistory(currentVideo);
  } catch (error) {
    console.error('Play error:', error);
    showNotification('Failed to load video. Please try again.', 'error');
    backBtn.click();
  }

  hideLoading();
}

async function loadComments(videoId) {
  commentsSection.innerHTML = '<p>Comments are not available in this version.</p>';
  // In a full implementation, you would fetch comments from the YouTube API
}

async function switchView(view) {
  currentView = view;
  resultsContainer.classList.remove('hidden');
  videoPlayer.classList.add('hidden');
  resultsGrid.innerHTML = '';

  showLoading();

  if (view === 'home') {
    await loadSmartHomeFeed();
  } else if (view === 'trending') {
    sectionTitle.textContent = 'Trending Now';
    const trendingResults = await loadTrendingContent();
    displayResults(trendingResults);
  } else if (view === 'subscriptions') {
    await loadSubscriptions();
  } else if (view === 'history') {
    await loadHistory();
  } else if (view === 'playlists') {
    await loadPlaylists();
  } else if (view === 'shorts') {
    sectionTitle.textContent = 'Shorts';
    searchInput.value = 'youtube shorts';
    await performSearch();
  }

  hideLoading();
}

// Smart algorithm for personalized home feed
async function loadSmartHomeFeed() {
  sectionTitle.textContent = 'For You';

  loadWatchHistory();

  let allResults = [];

  if (watchHistory.length > 0) {
    // Personalized recommendations based on watch history
    const recommendations = await getPersonalizedRecommendations();
    allResults = recommendations;
  }

  // Mix in trending content
  const trending = await loadTrendingContent();

  // Merge: 60% personalized, 40% trending
  const personalizedCount = Math.floor(allResults.length * 0.6);
  const trendingCount = Math.floor(trending.length * 0.4);

  const mixed = [
    ...allResults.slice(0, personalizedCount),
    ...trending.slice(0, trendingCount)
  ];

  // Shuffle to make it feel more natural
  const shuffled = shuffleArray(mixed);

  displayResults(shuffled);
}

async function getPersonalizedRecommendations() {
  // Extract keywords from watch history
  const keywords = extractKeywordsFromHistory();

  if (keywords.length === 0) {
    // No history yet, show popular content
    return await loadTrendingContent();
  }

  // Search for videos based on user's interests
  const allResults = [];

  for (const keyword of keywords.slice(0, 3)) {
    try {
      const results = await window.api.searchVideos(keyword);
      allResults.push(...results.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  }

  // Remove duplicates
  const uniqueResults = [];
  const seenIds = new Set();

  for (const result of allResults) {
    if (!seenIds.has(result.id)) {
      seenIds.add(result.id);
      uniqueResults.push(result);
    }
  }

  return uniqueResults;
}

function extractKeywordsFromHistory() {
  loadWatchHistory();

  if (watchHistory.length === 0) return [];

  // Extract important words from video titles
  const wordFrequency = {};
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
    'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
    'video', 'videos', '2024', '2025', 'youtube', 'new', 'best', 'top'
  ]);

  watchHistory.forEach(video => {
    const title = video.title.toLowerCase();
    const words = title.split(/\W+/).filter(word =>
      word.length > 3 && !stopWords.has(word) && !/^\d+$/.test(word)
    );

    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
  });

  // Sort by frequency and get top keywords
  const sortedKeywords = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 5);

  return sortedKeywords;
}

async function loadTrendingContent() {
  const categories = [
    'trending now',
    'viral videos',
    'top videos today',
    'popular videos',
    'most viewed today'
  ];

  // Pick a random category to keep it fresh
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];

  try {
    const results = await window.api.searchVideos(randomCategory);
    return results || [];
  } catch (error) {
    console.error('Error loading trending:', error);
    return [];
  }
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function loadSubscriptions() {
  sectionTitle.textContent = 'Subscriptions';
  subscriptions = await window.api.getSubscriptions();

  if (subscriptions.length === 0) {
    resultsGrid.innerHTML = '<p class="no-results">No subscriptions yet. Subscribe to channels to see their latest videos here!</p>';
    return;
  }

  resultsGrid.innerHTML = '<p class="no-results">Subscription feed coming soon! Your subscribed channels are saved.</p>';
}

async function loadHistory() {
  sectionTitle.textContent = 'Watch History';
  loadWatchHistory();

  if (watchHistory.length === 0) {
    resultsGrid.innerHTML = '<p class="no-results">No watch history yet. Videos you watch will appear here.</p>';
    return;
  }

  watchHistory.reverse().forEach(item => {
    const card = createVideoCard(item);
    resultsGrid.appendChild(card);
  });
}

async function loadPlaylists() {
  sectionTitle.textContent = 'Playlists';
  loadPlaylistsData();

  if (playlists.length === 0) {
    resultsGrid.innerHTML = '<p class="no-results">No playlists yet. Save videos to playlists while watching!</p>';
    return;
  }

  playlists.forEach(playlist => {
    const playlistCard = document.createElement('div');
    playlistCard.className = 'video-card';
    playlistCard.innerHTML = `
      <div class="thumbnail-container">
        <div class="playlist-thumbnail">
          ${playlist.videos[0] ?
            `<img src="${playlist.videos[0].thumbnail}" class="thumbnail">` :
            '<div class="thumbnail" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>'}
        </div>
      </div>
      <div class="video-info-card">
        <h3 class="video-title-card">${escapeHtml(playlist.name)}</h3>
        <p class="channel-name">${playlist.videos.length} videos</p>
      </div>
    `;
    resultsGrid.appendChild(playlistCard);
  });
}

function addToHistory(video) {
  const historyItem = {
    id: video.id,
    title: video.title,
    thumbnail: video.thumbnail,
    channelTitle: video.uploader,
    timestamp: Date.now()
  };

  // Remove if already in history
  watchHistory = watchHistory.filter(item => item.id !== video.id);

  // Add to beginning
  watchHistory.unshift(historyItem);

  // Keep only last 100 videos
  if (watchHistory.length > 100) {
    watchHistory = watchHistory.slice(0, 100);
  }

  saveWatchHistory();
}

function updateLikeButton() {
  if (currentVideo && likedVideos.has(currentVideo.id)) {
    likeBtn.classList.add('liked');
  } else {
    likeBtn.classList.remove('liked');
  }
}

// Local storage helpers
function saveWatchHistory() {
  localStorage.setItem('watchHistory', JSON.stringify(watchHistory));
}

function loadWatchHistory() {
  const saved = localStorage.getItem('watchHistory');
  if (saved) {
    watchHistory = JSON.parse(saved);
  }
}

function saveLikedVideos() {
  localStorage.setItem('likedVideos', JSON.stringify([...likedVideos]));
}

function loadLikedVideos() {
  const saved = localStorage.getItem('likedVideos');
  if (saved) {
    likedVideos = new Set(JSON.parse(saved));
  }
}

function savePlaylists() {
  localStorage.setItem('playlists', JSON.stringify(playlists));
}

function loadPlaylistsData() {
  const saved = localStorage.setItem('playlists');
  if (saved) {
    playlists = JSON.parse(saved);
  }
}

function showLoading() {
  loading.classList.remove('hidden');
}

function hideLoading() {
  loading.classList.add('hidden');
}

function showNotification(message, type = 'success') {
  // Simple alert for now
  alert(message);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

// Initialize app
window.addEventListener('DOMContentLoaded', async () => {
  // Load saved theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    theme = savedTheme;
    document.body.setAttribute('data-theme', theme);
  }

  // Load saved data
  loadWatchHistory();
  loadLikedVideos();
  loadPlaylistsData();

  // Load subscriptions from electron-store
  subscriptions = await window.api.getSubscriptions();

  // Load smart home feed with personalized recommendations
  await loadSmartHomeFeed();
});
