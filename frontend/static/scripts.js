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
        emptyState.style.display = 'none';

        libraryContainer.innerHTML = videos.map(video => `
            <div class="video-card">
                <div class="video-thumbnail" style="background: linear-gradient(135deg, #1e293b, #334155); display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 3rem;">
                    🎬
                </div>
                <div class="video-info">
                    <div class="video-title">${video.title}</div>
                    <div class="video-meta">Downloaded: ${new Date(video.downloadDate * 1000).toLocaleDateString()}</div>
                    <button class="play-btn" onclick="playVideo('${video.filename}')">
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

// Play video function
function playVideo(filename) {
    const videoPath = `/Downloads/${filename}`;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;

    modal.innerHTML = `
        <div style="position: relative; max-width: 90%; max-height: 90%;">
            <video controls autoplay style="width: 100%; height: auto; border-radius: 12px;">
                <source src="${videoPath}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
            <button onclick="this.closest('.modal').remove()" style="
                position: absolute;
                top: -10px;
                right: -10px;
                background: #ef4444;
                color: white;
                border: none;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                cursor: pointer;
                font-size: 18px;
            ">×</button>
        </div>
    `;

    modal.className = 'modal';
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    document.body.appendChild(modal);
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