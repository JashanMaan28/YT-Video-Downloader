console.log('YouTube Video Downloader UI Loaded');

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    loadVideoLibrary();
    
    // Add event listener for the download form
    const downloadForm = document.getElementById('download-form');
    if (downloadForm) {
        downloadForm.addEventListener('submit', handleDownload);
    }

    // Add event listener for the paste button
    const pasteButton = document.getElementById('paste-button');
    if(pasteButton) {
        pasteButton.addEventListener('click', handlePaste);
    }
});

// --- INITIALIZATION ---

/**
 * Initialize tab navigation and event listeners
 */
function initializeTabs() {
    // Set up initial tab state
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab, index) => {
        tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
        
        // Add click event listener for ripple effect
        tab.addEventListener('click', (e) => {
            triggerRippleEffect(tab);
        });
        
        // Add focus event listener
        tab.addEventListener('focus', () => {
            tabs.forEach(t => t.setAttribute('tabindex', '-1'));
            tab.setAttribute('tabindex', '0');
        });
    });
    
    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
}

/**
 * Add visual feedback for tab interactions
 */
function enhanceTabInteractions() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        // Add mouseenter effect
        tab.addEventListener('mouseenter', () => {
            if (!tab.classList.contains('active')) {
                const iconPulse = tab.querySelector('.icon-pulse');
                if (iconPulse) {
                    iconPulse.style.width = '50px';
                    iconPulse.style.height = '50px';
                    iconPulse.style.opacity = '0.2';
                }
            }
        });
        
        // Add mouseleave effect
        tab.addEventListener('mouseleave', () => {
            if (!tab.classList.contains('active')) {
                const iconPulse = tab.querySelector('.icon-pulse');
                if (iconPulse) {
                    iconPulse.style.width = '0';
                    iconPulse.style.height = '0';
                    iconPulse.style.opacity = '0';
                }
            }
        });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    enhanceTabInteractions();
    
    // Set up paste button functionality
    const pasteButton = document.getElementById('paste-button');
    if (pasteButton) {
        pasteButton.addEventListener('click', handlePasteButtonClick);
    }
    
    // Set up form validation
    const urlInput = document.getElementById('url');
    if (urlInput) {
        // Add real-time validation feedback
        urlInput.addEventListener('blur', () => {
            if (urlInput.value.trim()) {
                validateYouTubeURL(urlInput);
            }
        });
    }
});

// --- CORE FUNCTIONS ---

/**
 * Switches between the 'Download' and 'Library' tabs.
 */
function switchTab(tabName) {
    // Remove active classes from all tabs and content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });
    
    // Add active class to selected tab and content
    const selectedTab = event.target.closest('.tab');
    const selectedContent = document.getElementById(tabName + '-tab');
    
    if (selectedTab && selectedContent) {
        selectedContent.classList.add('active');
        selectedTab.classList.add('active');
        selectedTab.setAttribute('aria-selected', 'true');
        
        // Trigger ripple effect
        triggerRippleEffect(selectedTab);
        
        // Show notification for tab switch
        const tabTitle = selectedTab.querySelector('.tab-title').textContent;
        const tabSubtitle = selectedTab.querySelector('.tab-subtitle').textContent;
        showToast(`Switched to ${tabTitle}`, 'info', 2000, tabSubtitle);
        
        // Load library if switching to library tab
        if (tabName === 'library') {
            loadVideoLibrary();
        }
    }
}

/**
 * Handles keyboard navigation for tabs
 */
function handleTabKeydown(event) {
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const currentTab = event.target.closest('.tab');
    const currentIndex = tabs.indexOf(currentTab);
    
    switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
            event.preventDefault();
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
            tabs[prevIndex].focus();
            tabs[prevIndex].click();
            break;
            
        case 'ArrowRight':
        case 'ArrowDown':
            event.preventDefault();
            const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
            tabs[nextIndex].focus();
            tabs[nextIndex].click();
            break;
            
        case 'Home':
            event.preventDefault();
            tabs[0].focus();
            tabs[0].click();
            break;
            
        case 'End':
            event.preventDefault();
            tabs[tabs.length - 1].focus();
            tabs[tabs.length - 1].click();
            break;
            
        case 'Enter':
        case ' ':
            event.preventDefault();
            currentTab.click();
            break;
    }
}

/**
 * Creates a ripple effect when a tab is clicked
 */
function triggerRippleEffect(tab) {
    const ripple = tab.querySelector('.tab-ripple');
    if (ripple) {
        // Reset animation
        ripple.style.width = '0';
        ripple.style.height = '0';
        ripple.style.opacity = '0';
        
        // Trigger animation
        setTimeout(() => {
            ripple.style.width = '200px';
            ripple.style.height = '200px';
            ripple.style.opacity = '0.15';
        }, 10);
        
        // Reset after animation
        setTimeout(() => {
            ripple.style.width = '0';
            ripple.style.height = '0';
            ripple.style.opacity = '0';
        }, 500);
    }
}

/**
 * Fetches video data from the server and populates the library.
 */
async function loadVideoLibrary() {
    const libraryContainer = document.getElementById('video-library');
    const emptyState = document.getElementById('empty-library');

    try {
        const response = await fetch('/videos');
        const videos = await response.json();

        updateHeaderStats(videos);

        if (videos.length === 0) {
            libraryContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        libraryContainer.style.display = 'grid';
        emptyState.style.display = 'none';        libraryContainer.innerHTML = videos.map(video => {
            console.log('Processing video:', video.title);
            console.log('Thumbnail URL:', video.thumbnail);
            
            return `
            <div class="video-card">
                <div class="video-thumbnail-container">
                    ${video.thumbnail ? 
                        `<img src="${video.thumbnail}" alt="${video.title.replace(/"/g, '&quot;')}" class="video-thumbnail" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'fallback-thumbnail\\'>🎬</div>'">` :
                        `<div class="fallback-thumbnail">🎬</div>`
                    }
                    ${video.duration ? `<div class="duration-badge">${formatDuration(video.duration)}</div>` : ''}
                </div>
                <div class="video-info">
                    <div class="video-title" title="${video.title.replace(/"/g, '&quot;')}">${video.title}</div>
                    <div class="video-meta">
                        ${video.uploader ? `<div class="uploader">By: ${video.uploader}</div>` : ''}
                        <div class="download-date">Downloaded: ${new Date(video.downloadDate * 1000).toLocaleDateString()}</div>
                        <div class="file-size">Size: ${formatFileSize(video.fileSize || 0)}</div>
                    </div>
                    <button class="play-btn" onclick="playVideo('${video.filename.replace(/'/g, "\\'")}', '${video.title.replace(/'/g, "\\'")}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        Play Video
                    </button>
                </div>
            </div>        `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading video library:', error);
        libraryContainer.style.display = 'none';
        emptyState.style.display = 'block';
    }
}

/**
 * Handles the download form submission.
 */
async function handleDownload(event) {
    event.preventDefault();

    const url = document.getElementById('url').value;
    const statusDiv = document.getElementById('status');

    statusDiv.className = 'status-message';
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = '⏳ Downloading video...';

    try {
        const response = await fetch('/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });

        const result = await response.json();

        if (response.ok) {
            statusDiv.className = 'status-message status-success';
            statusDiv.innerHTML = `✅ ${result.message}`;
            document.getElementById('url').value = '';
            loadVideoLibrary(); // Reload library to show new video and update stats
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
    } catch (error) {
        statusDiv.className = 'status-message status-error';
        statusDiv.innerHTML = `❌ ${error.message}`;
    } finally {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
}

/**
 * Pastes text from the clipboard into the URL input field.
 */
async function handlePaste(event) {
    event.preventDefault();
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('url').value = text;
    } catch (error) {
        console.error('Failed to read clipboard contents: ', error);
        alert('Could not paste text. Please allow clipboard access or paste manually.');
    }
}

/**
 * Validates YouTube URL format and provides visual feedback
 */
function validateYouTubeURL(input) {
    const value = input.value.trim();
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/|youtube\.com\/playlist\?list=|youtube\.com\/shorts\/)[\w\-]+/i;
    
    // Remove previous validation classes
    input.classList.remove('valid', 'invalid');
    
    if (value === '') {
        // Empty input - neutral state
        return;
    }
    
    if (youtubeRegex.test(value)) {
        input.classList.add('valid');
        showToast('Valid YouTube URL detected!', 'success', 2000);
    } else {
        input.classList.add('invalid');
        showToast('Please enter a valid YouTube URL', 'warning', 3000, 'Invalid URL Format');
    }
}

/**
 * Enhanced paste handling for YouTube URLs
 */
async function handleURLPaste(event) {
    try {
        // Get clipboard data
        const clipboardData = event.clipboardData || window.clipboardData;
        const pastedText = clipboardData.getData('text');
        
        // Validate the pasted URL
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/|youtube\.com\/playlist\?list=|youtube\.com\/shorts\/)[\w\-]+/i;
        
        if (pastedText && youtubeRegex.test(pastedText.trim())) {
            showToast('YouTube URL pasted successfully!', 'success', 2000);
            // Let the default paste behavior continue
        } else if (pastedText) {
            event.preventDefault(); // Prevent invalid URL from being pasted
            showToast('Clipboard content is not a valid YouTube URL', 'error', 3000, 'Invalid Paste');
        }
    } catch (error) {
        console.error('Error handling paste:', error);
    }
}

/**
 * Enhanced paste button functionality
 */
async function handlePasteButtonClick() {
    try {
        const clipboardText = await navigator.clipboard.readText();
        const urlInput = document.getElementById('url');
        
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/|youtube\.com\/playlist\?list=|youtube\.com\/shorts\/)[\w\-]+/i;
        
        if (youtubeRegex.test(clipboardText.trim())) {
            urlInput.value = clipboardText.trim();
            urlInput.classList.add('valid');
            urlInput.classList.remove('invalid');
            showToast('YouTube URL pasted from clipboard!', 'success', 2000);
            
            // Trigger focus animation
            urlInput.focus();
        } else {
            showToast('Clipboard does not contain a valid YouTube URL', 'error', 3000, 'Invalid Clipboard Content');
        }
    } catch (error) {
        showToast('Unable to access clipboard. Please paste manually.', 'warning', 3000);
    }
}

/**
 * Opens the video player for the selected video.
 */
function playVideo(filename, title) {
    const params = new URLSearchParams();
    params.set('video', filename);
    params.set('title', title || filename);
    window.location.href = `player.html?${params.toString()}`;
}

/**
 * Updates the video count and storage stats in the header.
 * @param {Array} videos - The array of video objects from the server.
 */
function updateHeaderStats(videos) {
    const videoCount = videos.length;
    const { totalBytes, formattedSize } = calculateTotalStorage(videos);
    
    document.getElementById('video-count-value').textContent = videoCount;
    document.getElementById('storage-used-value').textContent = formattedSize;
    
    // Debug logging to verify the calculation
    console.log(`📊 Storage Stats Update:`);
    console.log(`  - Videos: ${videoCount}`);
    console.log(`  - Total bytes: ${totalBytes.toLocaleString()}`);
    console.log(`  - Formatted size: ${formattedSize}`);
}

/**
 * Formats file size from bytes to human-readable format.
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size (e.g., "1.5 GB", "250 MB", "1.2 KB")
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return `${size} ${sizes[i]}`;
}

/**
 * Calculates and returns total storage used by all videos.
 * @param {Array} videos - Array of video objects with fileSize property
 * @returns {Object} Object containing totalBytes and formattedSize
 */
function calculateTotalStorage(videos) {
    const totalBytes = videos.reduce((sum, video) => sum + (video.fileSize || 0), 0);
    return {
        totalBytes: totalBytes,
        formattedSize: formatFileSize(totalBytes)
    };
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'info', duration = 3000, title = '') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconSvg = getToastIcon(type);
    
    toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 400);
    }, duration);
}

/**
 * Get icon SVG for toast notifications
 */
function getToastIcon(type) {
    const icons = {
        success: `<svg viewBox="0 0 24 24" fill="currentColor" style="color: #2ea043;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>`,
        info: `<svg viewBox="0 0 24 24" fill="currentColor" style="color: #238636;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>`,
        warning: `<svg viewBox="0 0 24 24" fill="currentColor" style="color: #fb8500;">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>`,
        error: `<svg viewBox="0 0 24 24" fill="currentColor" style="color: #da3633;">
            <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
        </svg>`
    };
    return icons[type] || icons.info;
}

/**
 * Formats duration from seconds to readable format (HH:MM:SS or MM:SS)
 */
function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

/**
 * Clean up extra files created by yt-dlp
 */
async function cleanupFiles() {
    try {
        showToast('Cleaning up extra files...', 'info', 2000);
        
        const response = await fetch('/cleanup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message, 'success', 3000, 'Cleanup Complete');
            // Refresh the library to show updated files
            loadVideoLibrary();
        } else {
            showToast(result.error || 'Cleanup failed', 'error', 3000, 'Cleanup Error');
        }
    } catch (error) {
        console.error('Cleanup error:', error);
        showToast('Failed to clean up files', 'error', 3000, 'Network Error');
    }
}

/**
 * Debug function to check thumbnail loading
 */
function debugThumbnails() {
    const thumbnails = document.querySelectorAll('.video-thumbnail');
    console.log('Found thumbnails:', thumbnails.length);
    
    thumbnails.forEach((img, index) => {
        console.log(`Thumbnail ${index}:`, {
            src: img.src,
            alt: img.alt,
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight
        });
        
        if (!img.complete) {
            img.addEventListener('load', () => {
                console.log(`Thumbnail ${index} loaded successfully`);
            });
            
            img.addEventListener('error', (e) => {
                console.error(`Thumbnail ${index} failed to load:`, e);
            });
        }
    });
}

// --- EXISTING FUNCTIONS ---