document.addEventListener('DOMContentLoaded', function() {
    loadVideoLibrary();
    
    const downloadForm = document.getElementById('download-form');
    if (downloadForm) {
        downloadForm.addEventListener('submit', handleDownload);
    }

    const pasteButton = document.getElementById('paste-button');
    if(pasteButton) {
        pasteButton.addEventListener('click', handlePaste);
    }
    
    initializeTabs();
});

function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab, index) => {
        tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
        tab.addEventListener('click', () => triggerRippleEffect(tab));
        tab.addEventListener('focus', () => {
            tabs.forEach(t => t.setAttribute('tabindex', '-1'));
            tab.setAttribute('tabindex', '0');
        });
    });
    document.documentElement.style.scrollBehavior = 'smooth';
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });
    
    const selectedTab = event.target.closest('.tab');
    const selectedContent = document.getElementById(tabName + '-tab');
    
    if (selectedTab && selectedContent) {
        selectedContent.classList.add('active');
        selectedTab.classList.add('active');
        selectedTab.setAttribute('aria-selected', 'true');
        
        triggerRippleEffect(selectedTab);
        
        if (tabName === 'library') {
            loadVideoLibrary();
        }
    }
}

function triggerRippleEffect(tab) {
    const ripple = tab.querySelector('.tab-ripple');
    if (ripple) {
        ripple.style.width = '0';
        ripple.style.height = '0';
        ripple.style.opacity = '0';
        
        setTimeout(() => {
            ripple.style.width = '200px';
            ripple.style.height = '200px';
            ripple.style.opacity = '0.15';
        }, 10);
        
        setTimeout(() => {
            ripple.style.width = '0';
            ripple.style.height = '0';
            ripple.style.opacity = '0';
        }, 500);
    }
}

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
                    <div class="video-actions">
                        <button class="play-btn" onclick="playVideo('${video.filename.replace(/'/g, "\\'")}', '${video.title.replace(/'/g, "\\'")}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            Play Video
                        </button>
                        <button class="delete-btn" onclick="confirmDeleteVideo('${video.filename.replace(/'/g, "\\'")}', '${video.title.replace(/'/g, "\\'")}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                            Delete
                        </button>
                    </div>
                </div>
            </div>        `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading video library:', error);
        libraryContainer.style.display = 'none';
        emptyState.style.display = 'block';
    }
}

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
            loadVideoLibrary();
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

function validateYouTubeURL(input) {
    const value = input.value.trim();
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/|youtube\.com\/playlist\?list=|youtube\.com\/shorts\/)[\w\-]+/i;
    
    input.classList.remove('valid', 'invalid');
    
    if (value === '') {
        return;
    }
    
    if (youtubeRegex.test(value)) {
        input.classList.add('valid');
    } else {
        input.classList.add('invalid');
        showToast('Please enter a valid YouTube URL', 'warning', 3000, 'Invalid URL Format');
    }
}

function playVideo(filename, title) {
    const params = new URLSearchParams();
    params.set('video', filename);
    params.set('title', title || filename);
    window.location.href = `player.html?${params.toString()}`;
}

function updateHeaderStats(videos) {
    const videoCount = videos.length;
    const { totalBytes, formattedSize } = calculateTotalStorage(videos);
    
    document.getElementById('video-count-value').textContent = videoCount;
    document.getElementById('storage-used-value').textContent = formattedSize;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return `${size} ${sizes[i]}`;
}

function calculateTotalStorage(videos) {
    const totalBytes = videos.reduce((sum, video) => sum + (video.fileSize || 0), 0);
    return {
        totalBytes: totalBytes,
        formattedSize: formatFileSize(totalBytes)
    };
}

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
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 400);
    }, duration);
}

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

function confirmDeleteVideo(filename, title) {
    const modal = createConfirmationModal(filename, title);
    document.body.appendChild(modal);
    
    // Focus on the cancel button for accessibility
    setTimeout(() => {
        const cancelBtn = modal.querySelector('.cancel-btn');
        if (cancelBtn) cancelBtn.focus();
    }, 100);
}

function createConfirmationModal(filename, title) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'delete-modal-title');
    modal.setAttribute('aria-describedby', 'delete-modal-description');
    
    modal.innerHTML = `
        <div class="modal-content delete-modal">
            <div class="modal-header">
                <div class="modal-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </div>
                <h3 id="delete-modal-title">Delete Video</h3>
            </div>
            <div class="modal-body">
                <p id="delete-modal-description">
                    Are you sure you want to delete "<strong>${title}</strong>"?
                </p>
                <div class="warning-note">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                    <span>This action will permanently delete the video file, thumbnail, metadata, and any generated summaries. This cannot be undone.</span>
                </div>
            </div>
            <div class="modal-actions">
                <button class="cancel-btn" onclick="closeDeleteModal()">
                    Cancel
                </button>
                <button class="confirm-delete-btn" onclick="deleteVideo('${filename.replace(/'/g, "\\'")}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z"/>
                    </svg>
                    Delete Video
                </button>
            </div>
        </div>
    `;
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeDeleteModal();
        }
    });
    
    // Handle keyboard navigation
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDeleteModal();
        }
    });
    
    return modal;
}

function closeDeleteModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.classList.add('closing');
        setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        }, 300);
    }
}

async function deleteVideo(filename) {
    const modal = document.querySelector('.modal-overlay');
    const confirmBtn = modal.querySelector('.confirm-delete-btn');
    
    // Show loading state
    confirmBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="spinning">
            <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
        </svg>
        Deleting...
    `;
    confirmBtn.disabled = true;
    
    try {
        const response = await fetch('/delete_video', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename }),
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Success - close modal and show success message
            closeDeleteModal();
            showToast(result.message, 'success', 3000, 'Video Deleted');
            
            // Reload the video library to reflect the deletion
            loadVideoLibrary();
        } else {
            // Check if it's a partial deletion (video file failed but other files deleted)
            if (response.status === 500 && result.files_deleted && result.files_deleted.length > 0) {
                closeDeleteModal();
                showToast(result.error, 'warning', 6000, 'Partial Deletion');
                // Still reload library in case some files were deleted
                loadVideoLibrary();
            } else if (response.status === 423) {
                // File is in use
                closeDeleteModal();
                showToast('Video file is currently in use. Please close any video players and try again.', 'warning', 5000, 'File In Use');
            } else {
                throw new Error(result.error || 'Failed to delete video');
            }
        }
    } catch (error) {
        console.error('Error deleting video:', error);
        
        // Show error state
        confirmBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
            </svg>
            Error
        `;
        
        // Show error message
        showToast(error.message, 'error', 5000, 'Delete Failed');
        
        // Reset button after a delay
        setTimeout(() => {
            confirmBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z"/>
                </svg>
                Delete Video
            `;
            confirmBtn.disabled = false;
        }, 2000);
    }
}