// State management
let currentView = 'home';
let currentVideo = null;
let searchResults = [];
let subscriptions = [];

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsGrid = document.getElementById('resultsGrid');
const videoPlayer = document.getElementById('videoPlayer');
const videoElement = document.getElementById('videoElement');
const videoTitle = document.getElementById('videoTitle');
const videoUploader = document.getElementById('videoUploader');
const downloadBtn = document.getElementById('downloadBtn');
const backBtn = document.getElementById('backBtn');
const loading = document.getElementById('loading');
const resultsContainer = document.getElementById('resultsContainer');
const subsBtn = document.getElementById('subsBtn');

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
    alert('Video downloaded successfully to Downloads folder!');
  } else {
    alert('Download failed: ' + result.error);
  }
});

subsBtn.addEventListener('click', () => {
  switchView('subscriptions');
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

// Functions
async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  showLoading();
  resultsContainer.classList.remove('hidden');
  videoPlayer.classList.add('hidden');

  try {
    searchResults = await window.api.searchVideos(query);
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

  card.innerHTML = `
    <div class="thumbnail-container ${isShort ? 'short-thumbnail' : ''}">
      <img src="${thumbnail}" alt="${title}" class="thumbnail">
      ${duration ? `<span class="duration">${duration}</span>` : ''}
      ${isShort ? '<span class="short-badge">Short</span>' : ''}
    </div>
    <div class="video-info-card">
      <h3 class="video-title-card">${title}</h3>
      <p class="channel-name">${channelName}</p>
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
    currentVideo = { id: videoId, ...videoData };

    videoElement.src = videoData.url;
    videoTitle.textContent = videoData.title;
    videoUploader.textContent = videoData.uploader;

    videoPlayer.classList.remove('hidden');
    videoElement.play();
  } catch (error) {
    console.error('Play error:', error);
    alert('Failed to load video. Please try again.');
    backBtn.click();
  }

  hideLoading();
}

async function switchView(view) {
  currentView = view;
  resultsContainer.classList.remove('hidden');
  videoPlayer.classList.add('hidden');

  if (view === 'subscriptions') {
    await loadSubscriptions();
  } else if (view === 'shorts') {
    searchInput.value = 'shorts';
    await performSearch();
  } else if (view === 'home') {
    searchInput.value = 'popular videos';
    await performSearch();
  }
}

async function loadSubscriptions() {
  showLoading();
  subscriptions = await window.api.getSubscriptions();

  if (subscriptions.length === 0) {
    resultsGrid.innerHTML = '<p class="no-results">No subscriptions yet. Subscribe to channels while watching videos!</p>';
    hideLoading();
    return;
  }

  resultsGrid.innerHTML = '<h2>Your Subscriptions</h2>';

  for (const channel of subscriptions) {
    const videos = await window.api.getChannelVideos(channel.id);
    videos.slice(0, 5).forEach(video => {
      const card = createVideoCard(video);
      resultsGrid.appendChild(card);
    });
  }

  hideLoading();
}

function showLoading() {
  loading.classList.remove('hidden');
}

function hideLoading() {
  loading.classList.add('hidden');
}

// Initialize app
window.addEventListener('DOMContentLoaded', async () => {
  // Load initial popular content
  searchInput.value = 'popular videos 2025';
  await performSearch();
});
