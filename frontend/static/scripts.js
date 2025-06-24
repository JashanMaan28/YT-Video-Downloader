// YouTube Video Downloader UI
console.log('YouTube Video Downloader UI Loaded');

// Tab switching functionality
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName + '-tab').classList.add('active');
      // Add active class to clicked tab
    event.target.classList.add('active');
    
    // Load library if switching to library tab
    if (tabName === 'library') {
        loadVideoLibrary();
    }
}

// Load video library
async function loadVideoLibrary() {
    const libraryContainer = document.getElementById('video-library');
    const emptyState = document.getElementById('empty-library');

    try {
        const response = await fetch('/videos');
        const videos = await response.json();

        if (videos.length === 0) {
            libraryContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        libraryContainer.style.display = 'grid';
        emptyState.style.display = 'none';        libraryContainer.innerHTML = videos.map(video => `
            <div class="video-card">
                <div class="video-thumbnail" style="background: linear-gradient(135deg, #1e293b, #334155); display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 3rem;">
                    🎬
                </div>
                <div class="video-info">
                    <div class="video-title">${video.title}</div>
                    <div class="video-meta">Downloaded: ${new Date(video.downloadDate * 1000).toLocaleDateString()}</div>
                    <button class="play-btn" onclick="playVideo('${video.filename}', '${video.title}')">
                        ▶️ Play Video
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading video library:', error);
        libraryContainer.style.display = 'none';
        emptyState.style.display = 'block';
    }
}

// Play video function - opens dedicated player page
function playVideo(filename, title) {
    console.log('Playing video:', filename, title);
    
    // Create URL parameters for the player page
    const params = new URLSearchParams();
    params.set('video', filename);
    params.set('title', title || filename);
    
    // Open the dedicated player page in the same tab
    const playerUrl = `player.html?${params.toString()}`;
    console.log('Opening player at:', playerUrl);
    
    // Navigate to the player page
    window.location.href = playerUrl;
}

// Form submission handler
async function handleDownload(event) {
    event.preventDefault();

    const url = document.getElementById('url').value;
    const statusDiv = document.getElementById('status');

    // Show loading state
    statusDiv.className = 'status-message';
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = '⏳ Downloading video...';

    try {
        const response = await fetch('/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        const result = await response.json();

        if (response.ok) {
            statusDiv.className = 'status-message status-success';
            statusDiv.innerHTML = `✅ ${result.message}`;

            // Clear form
            document.getElementById('url').value = '';

            // Reload library to show new video
            loadVideoLibrary();
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
    } catch (error) {
        statusDiv.className = 'status-message status-error';
        statusDiv.innerHTML = `❌ ${error.message}`;
    } finally {
        // Hide status after 3 seconds
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadVideoLibrary();
    
    // Add event listener for the download form
    const downloadForm = document.getElementById('download-form');
    if (downloadForm) {
        downloadForm.addEventListener('submit', handleDownload);
    }
});