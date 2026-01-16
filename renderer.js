// State management
let currentView = 'home';
let currentVideo = null;
let searchResults = [];
let subscriptions = [];
let playlists = [];
let watchHistory = [];
let likedVideos = new Set();
let theme = 'dark';

// Infinite scroll state
let currentSearchQuery = '';
let nextPageToken = null;
let isLoadingMore = false;

// Request cancellation for video loading
let currentVideoRequest = null;

// Track event listeners for cleanup
const eventListeners = new Map();

// Video player state
let currentQuality = 'highest';
let playbackSpeed = 1.0;
let isTheaterMode = false;
let videoProgress = {}; // Track watch progress {videoId: {progress: 0-100, timestamp}}

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
const speedSelector = document.getElementById('speedSelector');
const loopBtn = document.getElementById('loopBtn');
const theaterBtn = document.getElementById('theaterBtn');
const shareBtn = document.getElementById('shareBtn');
const likeBtn = document.getElementById('likeBtn');
const subscribeBtn = document.getElementById('subscribeBtn');
const addToPlaylistBtn = document.getElementById('addToPlaylistBtn');
const videoLoadingOverlay = document.getElementById('videoLoadingOverlay');

// Shorts elements
const shortsViewer = document.getElementById('shortsViewer');
const shortsContainer = document.getElementById('shortsContainer');
const shortsCloseBtn = document.getElementById('shortsCloseBtn');
const volumeToggle = document.getElementById('volumeToggle');
let shortsData = [];
let currentShortIndex = 0;
let isMuted = true;

// Home page elements
const categoryChips = document.getElementById('categoryChips');
const loadingSkeletons = document.getElementById('loadingSkeletons');
const categories = [
  { name: 'All', query: '' },
  { name: 'Music', query: 'music' },
  { name: 'Gaming', query: 'gaming' },
  { name: 'News', query: 'news' },
  { name: 'Sports', query: 'sports' },
  { name: 'Education', query: 'education' },
  { name: 'Entertainment', query: 'entertainment' },
  { name: 'Technology', query: 'technology' }
];
let activeCategory = 'All';

// Event Listeners
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') performSearch();
});

// Infinite scroll listener
resultsContainer.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = resultsContainer;

  // Load more when user is 300px from bottom
  if (scrollHeight - scrollTop - clientHeight < 300) {
    loadMoreResults();
  }
});

backBtn.addEventListener('click', () => {
  // Cancel any pending video request
  if (currentVideoRequest) {
    currentVideoRequest.cancelled = true;
    currentVideoRequest = null;
  }

  // Properly cleanup video element to prevent memory leaks
  videoElement.pause();
  videoElement.removeAttribute('src');
  videoElement.load(); // This releases the video blob from memory

  // Clear current video state
  currentVideo = null;

  // Show results
  videoPlayer.classList.add('hidden');
  resultsContainer.classList.remove('hidden');
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

// Quality selector
qualitySelector.addEventListener('change', async (e) => {
  if (!currentVideo) return;

  currentQuality = e.target.value;
  const currentTime = videoElement.currentTime;
  const wasPlaying = !videoElement.paused;

  showNotification(`Changing quality to ${currentQuality}...`);

  try {
    // Re-fetch video with new quality preference
    const videoData = await window.api.getVideoUrl(currentVideo.id);
    videoElement.src = videoData.url;
    videoElement.currentTime = currentTime;

    if (wasPlaying) {
      await videoElement.play();
    }

    showNotification(`Quality changed to ${currentQuality}`);
  } catch (error) {
    showNotification('Failed to change quality', 'error');
  }
});

// Playback speed selector
speedSelector.addEventListener('change', (e) => {
  playbackSpeed = parseFloat(e.target.value);
  videoElement.playbackRate = playbackSpeed;
  showNotification(`Speed: ${playbackSpeed}x`);
});

// Loop button
loopBtn.addEventListener('click', () => {
  videoElement.loop = !videoElement.loop;
  loopBtn.classList.toggle('active');
  showNotification(videoElement.loop ? 'Loop enabled' : 'Loop disabled');
});

// Theater mode button
theaterBtn.addEventListener('click', () => {
  isTheaterMode = !isTheaterMode;
  videoPlayer.classList.toggle('theater-mode');
  theaterBtn.classList.toggle('active');
  showNotification(isTheaterMode ? 'Theater mode enabled' : 'Theater mode disabled');
});

// Share button
shareBtn.addEventListener('click', async () => {
  if (!currentVideo) return;

  const url = `https://www.youtube.com/watch?v=${currentVideo.id}`;

  try {
    await navigator.clipboard.writeText(url);
    showNotification('Link copied to clipboard!');
  } catch (error) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showNotification('Link copied to clipboard!');
  }
});

// Shorts close button
shortsCloseBtn.addEventListener('click', () => {
  shortsViewer.classList.add('hidden');
  resultsContainer.classList.remove('hidden');

  // FIX MEMORY LEAK: Properly cleanup all Short videos
  document.querySelectorAll('.short-video').forEach(v => {
    v.pause();

    // Remove all event listeners for this video
    const listeners = eventListeners.get(v);
    if (listeners) {
      listeners.forEach(({ event, handler }) => {
        v.removeEventListener(event, handler);
      });
      eventListeners.delete(v);
    }

    // Clear video source to release memory
    v.removeAttribute('src');
    v.load();
  });

  // Remove keyboard listener
  document.removeEventListener('keydown', handleShortsKeyboard);
});

// Volume toggle
volumeToggle.addEventListener('click', () => {
  isMuted = !isMuted;
  const currentVideo = document.querySelector(`.short-item[data-index="${currentShortIndex}"] .short-video`);
  if (currentVideo) {
    currentVideo.muted = isMuted;
  }
  updateVolumeIcon();
});

// Keyboard shortcuts for main video player
document.addEventListener('keydown', (e) => {
  // Skip if user is typing in an input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    return;
  }

  // Only activate shortcuts when video player is visible
  if (!videoPlayer.classList.contains('hidden')) {
    switch(e.key.toLowerCase()) {
      case ' ':
      case 'k':
        e.preventDefault();
        if (videoElement.paused) {
          videoElement.play();
        } else {
          videoElement.pause();
        }
        break;

      case 'f':
        e.preventDefault();
        if (!document.fullscreenElement) {
          videoElement.requestFullscreen().catch(err => console.log(err));
        } else {
          document.exitFullscreen();
        }
        break;

      case 't':
        e.preventDefault();
        theaterBtn.click();
        break;

      case 'm':
        e.preventDefault();
        videoElement.muted = !videoElement.muted;
        showNotification(videoElement.muted ? 'Muted' : 'Unmuted');
        break;

      case 'l':
        e.preventDefault();
        loopBtn.click();
        break;

      case 'arrowleft':
      case 'j':
        e.preventDefault();
        videoElement.currentTime = Math.max(0, videoElement.currentTime - 10);
        break;

      case 'arrowright':
      case 'l':
        e.preventDefault();
        videoElement.currentTime = Math.min(videoElement.duration, videoElement.currentTime + 10);
        break;

      case 'arrowup':
        e.preventDefault();
        videoElement.volume = Math.min(1, videoElement.volume + 0.1);
        showNotification(`Volume: ${Math.round(videoElement.volume * 100)}%`);
        break;

      case 'arrowdown':
        e.preventDefault();
        videoElement.volume = Math.max(0, videoElement.volume - 0.1);
        showNotification(`Volume: ${Math.round(videoElement.volume * 100)}%`);
        break;

      case 'escape':
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          backBtn.click();
        }
        break;

      case '0': case '1': case '2': case '3': case '4':
      case '5': case '6': case '7': case '8': case '9':
        e.preventDefault();
        const percent = parseInt(e.key) / 10;
        videoElement.currentTime = videoElement.duration * percent;
        showNotification(`Jumped to ${e.key}0%`);
        break;

      case '>':
      case '.':
        e.preventDefault();
        const newSpeed = Math.min(2, playbackSpeed + 0.25);
        speedSelector.value = newSpeed;
        speedSelector.dispatchEvent(new Event('change'));
        break;

      case '<':
      case ',':
        e.preventDefault();
        const lowerSpeed = Math.max(0.25, playbackSpeed - 0.25);
        speedSelector.value = lowerSpeed;
        speedSelector.dispatchEvent(new Event('change'));
        break;
    }
  }
});

// Keyboard navigation for Shorts
function handleShortsKeyboard(e) {
  if (!shortsViewer.classList.contains('hidden')) {
    const currentVideo = document.querySelector(`.short-item[data-index="${currentShortIndex}"] .short-video`);

    switch(e.key) {
      case 'ArrowUp':
        e.preventDefault();
        navigateShort('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigateShort('down');
        break;
      case ' ':
        e.preventDefault();
        if (currentVideo) {
          if (currentVideo.paused) {
            currentVideo.play();
          } else {
            currentVideo.pause();
          }
        }
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        volumeToggle.click();
        break;
      case 'Escape':
        shortsCloseBtn.click();
        break;
    }
  }
}

function navigateShort(direction) {
  const newIndex = direction === 'up'
    ? Math.max(0, currentShortIndex - 1)
    : Math.min(shortsData.length - 1, currentShortIndex + 1);

  if (newIndex !== currentShortIndex) {
    shortsContainer.scrollTo({
      top: newIndex * shortsContainer.clientHeight,
      behavior: 'smooth'
    });
  }
}

function updateVolumeIcon() {
  const volumeOn = volumeToggle.querySelector('.volume-on');
  const volumeOff = volumeToggle.querySelector('.volume-off');

  if (isMuted) {
    volumeOn.classList.add('hidden');
    volumeOff.classList.remove('hidden');
  } else {
    volumeOn.classList.remove('hidden');
    volumeOff.classList.add('hidden');
  }
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const view = item.getAttribute('data-view');
    switchView(view);
  });
});

// Functions
async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  // Reset pagination state for new search
  currentSearchQuery = query;
  nextPageToken = null;
  searchResults = [];

  showLoading();
  resultsContainer.classList.remove('hidden');
  videoPlayer.classList.add('hidden');

  try {
    const response = await window.api.searchVideos(query, 50);
    searchResults = response.items || [];
    nextPageToken = response.nextPage;
    sectionTitle.textContent = `Search results for "${query}"`;
    displayResults(searchResults);
  } catch (error) {
    console.error('Search error:', error);
    resultsGrid.innerHTML = '<p class="error">Search failed. Please try again.</p>';
  }

  hideLoading();
}

// Load more results when scrolling
async function loadMoreResults() {
  if (isLoadingMore || !nextPageToken) return;

  isLoadingMore = true;
  showLoadMoreIndicator();

  try {
    const response = await window.api.loadNextPage(nextPageToken);

    if (response.items && response.items.length > 0) {
      searchResults = [...searchResults, ...response.items];
      appendResults(response.items);
      nextPageToken = response.nextPage;
    } else {
      nextPageToken = null;
    }
  } catch (error) {
    console.error('Load more error:', error);
    nextPageToken = null;
  }

  isLoadingMore = false;
  hideLoadMoreIndicator();
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

function appendResults(results) {
  if (!results || results.length === 0) return;

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

  // Extract views and publish date - ESCAPE ALL USER DATA
  const views = item.viewCount?.text || item.viewCountText || '';
  const publishedTime = item.publishedTimeText || item.publishTime || '';

  // Check if video has watch progress
  const progress = videoProgress[videoId];
  const progressPercent = progress && progress.progress > 0 && progress.progress < 95 ? progress.progress : 0;

  // FIX XSS: Escape all data before inserting into innerHTML
  card.innerHTML = `
    <div class="thumbnail-container ${isShort ? 'short-thumbnail' : ''}">
      <img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(title)}" class="thumbnail" loading="lazy">
      ${duration ? `<span class="duration">${escapeHtml(duration)}</span>` : ''}
      ${isShort ? '<span class="short-badge">Short</span>' : ''}
      ${progressPercent > 0 ? `<div class="progress-bar" style="width: ${progressPercent}%"></div>` : ''}
    </div>
    <div class="video-info-card">
      <h3 class="video-title-card">${escapeHtml(title)}</h3>
      <p class="channel-name" data-channel-id="${escapeHtml(item.channelId || '')}" data-channel-name="${escapeHtml(channelName)}">${escapeHtml(channelName)}</p>
      <div class="video-metadata">
        ${views ? `<span class="views">${escapeHtml(views)}</span>` : ''}
        ${views && publishedTime ? '<span class="separator">•</span>' : ''}
        ${publishedTime ? `<span class="published-time">${escapeHtml(publishedTime)}</span>` : ''}
      </div>
    </div>
  `;

  // Click video thumbnail/title to play
  const thumbnailContainer = card.querySelector('.thumbnail-container');
  const videoTitleEl = card.querySelector('.video-title-card');

  thumbnailContainer.addEventListener('click', () => playVideo(videoId, item));
  videoTitleEl.addEventListener('click', () => playVideo(videoId, item));

  // Click channel name to view channel
  const channelNameEl = card.querySelector('.channel-name');
  channelNameEl.style.cursor = 'pointer';
  channelNameEl.addEventListener('click', (e) => {
    e.stopPropagation();
    const channelId = channelNameEl.dataset.channelId || channelName;
    const channelNameText = channelNameEl.dataset.channelName;
    viewChannel(channelId, channelNameText);
  });

  return card;
}

async function playVideo(videoId, videoInfo) {
  // Cancel previous video request if any
  if (currentVideoRequest) {
    currentVideoRequest.cancelled = true;
  }

  // Create new request tracker
  const requestToken = { cancelled: false };
  currentVideoRequest = requestToken;

  showLoading();
  resultsContainer.classList.add('hidden');
  videoPlayer.classList.remove('hidden');

  // Show video loading overlay
  videoLoadingOverlay.classList.remove('hidden');

  try {
    const videoData = await window.api.getVideoUrl(videoId);

    // Check if this request was cancelled
    if (requestToken.cancelled) {
      console.log('Video request was cancelled');
      videoLoadingOverlay.classList.add('hidden');
      return;
    }

    currentVideo = { id: videoId, ...videoData, ...videoInfo };

    videoElement.src = videoData.url;
    videoTitle.textContent = videoData.title;
    videoUploader.textContent = videoData.uploader;

    // Make channel name clickable
    videoUploader.style.cursor = 'pointer';
    videoUploader.onclick = () => {
      const channelId = currentVideo.channelId || currentVideo.uploader;
      viewChannel(channelId, currentVideo.uploader);
    };

    // Resume from saved progress if available
    const savedProgress = videoProgress[videoId];
    if (savedProgress && savedProgress.progress > 0 && savedProgress.progress < 95) {
      videoElement.currentTime = (savedProgress.progress / 100) * videoData.duration;
      showNotification(`Resuming from ${Math.round(savedProgress.progress)}%`);
    }

    // Track watch progress
    videoElement.addEventListener('timeupdate', () => {
      if (videoElement.duration) {
        const progress = (videoElement.currentTime / videoElement.duration) * 100;
        videoProgress[videoId] = {
          progress,
          timestamp: Date.now(),
          duration: videoElement.duration
        };
        saveVideoProgress();
      }
    });

    // FIX XSS: Escape description content before inserting
    // Convert newlines to <br> tags safely
    const safeDescription = escapeHtml(videoData.description || '').replace(/\n/g, '<br>');
    videoDescription.innerHTML = safeDescription ||
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

    // Hide loading overlay once video is ready
    videoElement.addEventListener('loadeddata', () => {
      videoLoadingOverlay.classList.add('hidden');
    }, { once: true });

    videoElement.play();

    // Add to history
    addToHistory(currentVideo);
  } catch (error) {
    console.error('Play error:', error);
    const errorMsg = error.message || 'Failed to load video. Please try again.';
    showNotification(errorMsg, 'error');
    videoLoadingOverlay.classList.add('hidden');
    backBtn.click();
  }

  hideLoading();
}

// Comments removed - not supported in this version

async function viewChannel(channelId, channelName) {
  showLoading();

  try {
    // Search for videos from this channel
    const channelQuery = channelName || channelId;
    const response = await window.api.searchVideos(channelQuery);
    const results = response.items || [];

    // Filter to show only videos from this channel (best effort)
    const channelVideos = results.filter(video => {
      const videoChannelName = video.channelTitle || video.channelName || '';
      return videoChannelName.toLowerCase().includes(channelQuery.toLowerCase());
    });

    // Show channel page
    videoPlayer.classList.add('hidden');
    resultsContainer.classList.remove('hidden');
    sectionTitle.textContent = `${channelName || channelId}`;

    if (channelVideos.length === 0) {
      resultsGrid.innerHTML = `<p class="no-results">No videos found for this channel. Showing related results...</p>`;
      displayResults(results);
    } else {
      displayResults(channelVideos);
    }
  } catch (error) {
    console.error('Channel view error:', error);
    showNotification('Failed to load channel', 'error');
    resultsGrid.innerHTML = '<p class="error">Failed to load channel. Please try again.</p>';
  }

  hideLoading();
}

async function switchView(view) {
  currentView = view;

  if (view === 'shorts') {
    // Hide regular content and show Shorts viewer
    resultsContainer.classList.add('hidden');
    videoPlayer.classList.add('hidden');
    shortsViewer.classList.remove('hidden');
    await loadShorts();
  } else {
    // Hide Shorts viewer and show regular content
    shortsViewer.classList.add('hidden');
    resultsContainer.classList.remove('hidden');
    videoPlayer.classList.add('hidden');
    resultsGrid.innerHTML = '';

    showLoading();

    if (view === 'home') {
      displayCategoryChips();
      await loadSmartHomeFeed();
    } else {
      // Hide category chips on other pages
      if (categoryChips) {
        categoryChips.classList.add('hidden');
      }

      if (view === 'trending') {
        sectionTitle.textContent = 'Trending Now';
        const trendingResults = await loadTrendingContent();
        displayResults(trendingResults || []);
      } else if (view === 'subscriptions') {
        await loadSubscriptions();
      } else if (view === 'history') {
        await loadHistory();
      } else if (view === 'liked') {
        await loadLikedVideos();
      } else if (view === 'playlists') {
        await loadPlaylists();
      } else if (view === 'shorts') {
        await loadShorts();
      }
    }

    hideLoading();
  }
}

// Smart algorithm for personalized home feed - Optimized
async function loadSmartHomeFeed() {
  sectionTitle.textContent = 'For You';

  loadWatchHistory();

  // Just load trending for speed - users can use categories for personalization
  const trendingResponse = await loadTrendingContent();
  const trending = trendingResponse.items || trendingResponse || [];
  displayResults(trending.slice(0, 12)); // Limit to 12 videos for speed
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
      const response = await window.api.searchVideos(keyword);
      const results = response.items || [];
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
    const response = await window.api.searchVideos(randomCategory);
    return response.items || [];
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

  resultsGrid.innerHTML = '';
  watchHistory.slice().reverse().forEach(item => {
    const card = createVideoCard(item);
    resultsGrid.appendChild(card);
  });
}

async function loadLikedVideos() {
  sectionTitle.textContent = 'Liked Videos';
  loadLikedVideosData();

  if (likedVideos.size === 0) {
    resultsGrid.innerHTML = '<p class="no-results">No liked videos yet. Like videos while watching!</p>';
    return;
  }

  // Filter watch history to show only liked videos
  const likedVideosList = watchHistory.filter(video => likedVideos.has(video.id));

  if (likedVideosList.length === 0) {
    resultsGrid.innerHTML = '<p class="no-results">No liked videos in your watch history yet.</p>';
    return;
  }

  resultsGrid.innerHTML = '';
  likedVideosList.slice().reverse().forEach(item => {
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

function loadLikedVideosData() {
  const saved = localStorage.getItem('likedVideos');
  if (saved) {
    likedVideos = new Set(JSON.parse(saved));
  }
}

function savePlaylists() {
  localStorage.setItem('playlists', JSON.stringify(playlists));
}

function loadPlaylistsData() {
  // FIX BUG: Was using setItem instead of getItem
  const saved = localStorage.getItem('playlists');
  if (saved) {
    playlists = JSON.parse(saved);
  }
}

function saveVideoProgress() {
  localStorage.setItem('videoProgress', JSON.stringify(videoProgress));
}

function loadVideoProgress() {
  const saved = localStorage.getItem('videoProgress');
  if (saved) {
    videoProgress = JSON.parse(saved);
  }
}

function showLoading() {
  loading.classList.remove('hidden');
  if (loadingSkeletons) {
    resultsGrid.classList.add('hidden');
    loadingSkeletons.classList.remove('hidden');
  }
}

function hideLoading() {
  loading.classList.add('hidden');
  if (loadingSkeletons) {
    loadingSkeletons.classList.add('hidden');
    resultsGrid.classList.remove('hidden');
  }
}

function showLoadMoreIndicator() {
  let indicator = document.getElementById('loadMoreIndicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'loadMoreIndicator';
    indicator.className = 'load-more-indicator';
    indicator.innerHTML = '<div class="spinner"></div><p>Loading more videos...</p>';
    resultsGrid.appendChild(indicator);
  }
  indicator.classList.remove('hidden');
}

function hideLoadMoreIndicator() {
  const indicator = document.getElementById('loadMoreIndicator');
  if (indicator) {
    indicator.classList.add('hidden');
  }
}

// Category chip functions
function displayCategoryChips() {
  if (!categoryChips) return;

  categoryChips.innerHTML = '';
  categoryChips.classList.remove('hidden');

  categories.forEach(category => {
    const chip = document.createElement('button');
    chip.className = `category-chip ${category.name === activeCategory ? 'active' : ''}`;
    chip.textContent = category.name;
    chip.addEventListener('click', () => selectCategory(category.name));
    categoryChips.appendChild(chip);
  });
}

async function selectCategory(categoryName) {
  activeCategory = categoryName;
  displayCategoryChips();

  const category = categories.find(c => c.name === categoryName);
  if (!category) return;

  showLoading();

  if (category.name === 'All') {
    await loadSmartHomeFeed();
  } else {
    const response = await window.api.searchVideos(category.query);
    const results = response.items || [];
    const filtered = results.filter(item => item.type === 'video' || item.type === 'shorts');
    displayResults(filtered.slice(0, 12)); // Limit to 12 videos for speed
  }

  hideLoading();
}

function showNotification(message, type = 'success') {
  // Create a better toast notification instead of alert()
  const notification = document.createElement('div');
  notification.className = `toast-notification toast-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'error' ? '#f44336' : '#4caf50'};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease;
    max-width: 400px;
    word-wrap: break-word;
  `;

  document.body.appendChild(notification);

  // Auto remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
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

// Shorts functionality - Optimized
async function loadShorts() {
  showLoading();
  try {
    // Single search for speed
    const response = await window.api.searchVideos('#shorts');
    const results = response.items || [];

    // Filter for short videos (under 60 seconds)
    shortsData = results.filter(item =>
      item.type === 'shorts' ||
      item.type === 'video' && (
        item.length && item.length.simpleText &&
        (item.length.simpleText.split(':').length === 2 &&
         parseInt(item.length.simpleText.split(':')[0]) === 0 &&
         parseInt(item.length.simpleText.split(':')[1]) < 60)
      )
    ).slice(0, 15); // Limit to 15 shorts for speed

    if (shortsData.length === 0) {
      shortsData = results.slice(0, 15); // Fallback
    }

    displayShorts();
    // Enable keyboard navigation
    document.addEventListener('keydown', handleShortsKeyboard);
    hideLoading();
  } catch (error) {
    console.error('Error loading Shorts:', error);
    hideLoading();
    showNotification('Failed to load Shorts', 'error');
  }
}

async function displayShorts() {
  shortsContainer.innerHTML = '';

  for (let i = 0; i < Math.min(shortsData.length, 20); i++) {
    const short = shortsData[i];
    const shortItem = document.createElement('div');
    shortItem.className = 'short-item';
    shortItem.dataset.index = i;

    shortItem.innerHTML = `
      <video class="short-video"
             data-video-id="${short.id}"
             playsinline
             loop>
      </video>
      <div class="short-loading">Loading...</div>
      <div class="short-progress">
        <div class="short-progress-bar"></div>
      </div>
      <div class="short-info">
        <div class="short-title">${escapeHtml(short.title)}</div>
        <div class="short-uploader">${escapeHtml(short.channelTitle || 'YouTube')}</div>
      </div>
      <div class="short-actions">
        <button class="short-action-btn short-like-btn" title="Like">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
          </svg>
        </button>
        <button class="short-action-btn short-share-btn" title="Share">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
        </button>
      </div>
    `;

    shortsContainer.appendChild(shortItem);
  }

  // Set up scroll detection
  setupShortsScrollDetection();

  // Load first video
  if (shortsData.length > 0) {
    loadShortVideo(0);
  }
}

async function loadShortVideo(index) {
  const shortItem = shortsContainer.querySelector(`.short-item[data-index="${index}"]`);
  if (!shortItem) return;

  const video = shortItem.querySelector('.short-video');
  const loadingEl = shortItem.querySelector('.short-loading');
  const progressBar = shortItem.querySelector('.short-progress-bar');
  const videoId = video.dataset.videoId;

  // Mark as active
  document.querySelectorAll('.short-item').forEach(item => item.classList.remove('active'));
  shortItem.classList.add('active');

  if (video.src) {
    // Already loaded
    video.muted = isMuted;
    video.play().catch(e => console.log('Play error:', e));
    return;
  }

  try {
    loadingEl.style.display = 'block';
    const videoData = await window.api.getVideoUrl(videoId);
    video.src = videoData.url;
    video.muted = isMuted;
    loadingEl.style.display = 'none';

    // FIX MEMORY LEAK: Store event listeners so they can be cleaned up
    // Create named functions for event listeners
    const handleTimeUpdate = () => {
      const progress = (video.currentTime / video.duration) * 100;
      progressBar.style.width = `${progress}%`;
    };

    const handleClick = () => {
      isMuted = !isMuted;
      video.muted = isMuted;
      updateVolumeIcon();
    };

    // Add listeners and store references for cleanup
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('click', handleClick);

    // Store cleanup function for this video element
    if (!eventListeners.has(video)) {
      eventListeners.set(video, []);
    }
    eventListeners.get(video).push(
      { event: 'timeupdate', handler: handleTimeUpdate },
      { event: 'click', handler: handleClick }
    );

    // Auto-play
    await video.play().catch(e => {
      console.log('Play error:', e);
      loadingEl.textContent = 'Click to play';
    });
  } catch (error) {
    console.error('Error loading Short video:', error);
    loadingEl.textContent = 'Failed to load - Try next';
    loadingEl.style.cursor = 'pointer';
    loadingEl.onclick = () => {
      if (index + 1 < shortsData.length) {
        navigateShort('down');
      }
    };
  }
}

function setupShortsScrollDetection() {
  let isScrolling;

  shortsContainer.addEventListener('scroll', () => {
    clearTimeout(isScrolling);

    isScrolling = setTimeout(() => {
      const scrollTop = shortsContainer.scrollTop;
      const viewportHeight = shortsContainer.clientHeight;
      const currentIndex = Math.round(scrollTop / viewportHeight);

      // Pause all videos
      document.querySelectorAll('.short-video').forEach(v => v.pause());

      // Load and play current video
      loadShortVideo(currentIndex);

      // Preload next video
      if (currentIndex + 1 < shortsData.length) {
        loadShortVideo(currentIndex + 1);
      }

      currentShortIndex = currentIndex;
    }, 100);
  });
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
  loadLikedVideosData();
  loadPlaylistsData();
  loadVideoProgress();

  // Load subscriptions from electron-store
  subscriptions = await window.api.getSubscriptions();

  // Load smart home feed with personalized recommendations
  await loadSmartHomeFeed();
});
