// Video player class with transcription and summary features
class VideoPlayer {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.controlsTimeout = null;
        this.summaryData = null;
        this.isGeneratingSummary = false;
        
        // Initialize player
        this.loadVideo();
    }

    initializeElements() {
        // URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.filename = urlParams.get('video');
        this.title = urlParams.get('title') || this.filename;

        // Video elements
        this.video = document.getElementById('main-video');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.errorMessage = document.getElementById('error-message');
        this.videoContainer = document.getElementById('video-container');
        
        // Info elements
        this.videoTitle = document.getElementById('video-title');
        this.filenameEl = document.getElementById('filename');
        this.filesizeEl = document.getElementById('filesize');
        this.durationEl = document.getElementById('duration');
        this.resolutionEl = document.getElementById('resolution');
        
        // Control elements
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.centerPlayBtn = document.getElementById('center-play-btn');
        this.skipBackward = document.getElementById('skip-backward');
        this.skipForward = document.getElementById('skip-forward');
        this.volumeBtn = document.getElementById('volume-btn');
        this.volumeSlider = document.getElementById('volume-slider');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');
        this.progressContainer = document.getElementById('progress-container');
        this.progressFilled = document.getElementById('progress-filled');
        this.timeDisplay = document.getElementById('time-display');        this.videoControls = document.getElementById('video-controls');
        
        // Summary elements
        this.summarizeBtn = document.getElementById('summarize-btn');
        this.summaryContent = document.getElementById('summary-content');
        this.transcriptContent = document.getElementById('transcript-content');
        
        // Tab elements
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabPanels = document.querySelectorAll('.tab-panel');
    }

    setupEventListeners() {
        // Video events
        this.video.addEventListener('loadedmetadata', () => this.onVideoLoaded());
        this.video.addEventListener('error', () => this.onVideoError());
        this.video.addEventListener('timeupdate', () => {
            this.updateProgress();
            this.updateTimeDisplay();
        });

        // Control events
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.centerPlayBtn.addEventListener('click', () => this.togglePlayPause());
        this.video.addEventListener('click', () => this.togglePlayPause());
        
        this.skipBackward.addEventListener('click', () => this.skipTime(-10));
        this.skipForward.addEventListener('click', () => this.skipTime(10));
        
        this.volumeBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.progressContainer.addEventListener('click', (e) => this.seekVideo(e));

        // Controls visibility
        this.videoContainer.addEventListener('mousemove', () => this.showControls());
        this.videoContainer.addEventListener('mouseleave', () => this.hideControls());        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Summary events
        this.summarizeBtn.addEventListener('click', () => this.generateSummary());

        // Tab events
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Load existing summary
        this.loadExistingSummary();
    }

    loadVideo() {
        if (!this.filename) {
            this.showError('No video specified in URL parameters.');
            return;
        }

        this.videoTitle.textContent = this.title;
        this.filenameEl.textContent = this.filename;

        const videoPath = `/Downloads/${encodeURIComponent(this.filename)}`;
        this.video.src = videoPath;

        // Get file size
        fetch(videoPath, { method: 'HEAD' })
            .then(response => {
                if (response.ok) {
                    const size = response.headers.get('content-length');
                    if (size) this.filesizeEl.textContent = this.formatFileSize(parseInt(size));
                } else {
                    this.showError(`Video file not found (HTTP ${response.status})`);
                }
            })
            .catch(() => {
                this.showError('Could not access the video file.');
            });
    }

    onVideoLoaded() {
        if (this.video.duration) {
            this.durationEl.textContent = this.formatTime(this.video.duration);
        }
        if (this.video.videoWidth && this.video.videoHeight) {
            this.resolutionEl.textContent = `${this.video.videoWidth} × ${this.video.videoHeight}`;
        }
        
        this.loading.style.display = 'none';
        this.videoContainer.style.display = 'block';
        this.centerPlayBtn.classList.add('show');
        this.updateTimeDisplay();
        this.updateVolumeIcon();
    }

    onVideoError() {
        this.showError('The video file could not be played. It may be missing, corrupted, or in an unsupported format.');
    }

    togglePlayPause() {
        if (this.video.paused) {
            this.video.play();
            this.playPauseBtn.textContent = '⏸';
            this.centerPlayBtn.classList.remove('show');
        } else {
            this.video.pause();
            this.playPauseBtn.textContent = '▶';
            this.centerPlayBtn.classList.add('show');
        }
    }

    skipTime(seconds) {
        this.video.currentTime += seconds;
    }

    toggleMute() {
        this.video.muted = !this.video.muted;
        this.updateVolumeIcon();
    }

    setVolume(value) {
        this.video.volume = value / 100;
        this.video.muted = false;
        this.updateVolumeIcon();
    }

    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.videoContainer.requestFullscreen();
        }
    }

    seekVideo(e) {
        const rect = this.progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percentage = clickX / width;
        this.video.currentTime = percentage * this.video.duration;
    }

    updateVolumeIcon() {
        if (this.video.muted || this.video.volume === 0) {
            this.volumeBtn.textContent = '🔇';
        } else if (this.video.volume < 0.5) {
            this.volumeBtn.textContent = '🔉';
        } else {
            this.volumeBtn.textContent = '🔊';
        }
    }

    updateProgress() {
        if (this.video.duration) {
            const percentage = (this.video.currentTime / this.video.duration) * 100;
            this.progressFilled.style.width = percentage + '%';
        }
    }

    updateTimeDisplay() {
        const current = this.formatTime(this.video.currentTime);
        const duration = this.formatTime(this.video.duration);
        this.timeDisplay.textContent = `${current} / ${duration}`;
    }

    showControls() {
        this.videoControls.classList.add('show');
        clearTimeout(this.controlsTimeout);
        this.controlsTimeout = setTimeout(() => this.hideControls(), 3000);
    }

    hideControls() {
        if (!this.video.paused) {
            this.videoControls.classList.remove('show');
        }
    }

    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT') return;

        switch(e.key) {
            case ' ':
            case 'k':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.skipTime(-10);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.skipTime(10);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.video.volume = Math.min(1, this.video.volume + 0.1);
                this.volumeSlider.value = this.video.volume * 100;
                this.updateVolumeIcon();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.video.volume = Math.max(0, this.video.volume - 0.1);
                this.volumeSlider.value = this.video.volume * 100;
                this.updateVolumeIcon();
                break;
            case 'm':
                e.preventDefault();
                this.toggleMute();
                break;
            case 'f':
                e.preventDefault();
                this.toggleFullscreen();
                break;
        }        this.showControls();
    }
    
    switchTab(tabName) {
        // Update tab buttons
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab panels
        this.tabPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}-panel`);
        });    }

    async loadExistingSummary() {
        try {
            const response = await fetch(`/summary/${encodeURIComponent(this.filename)}`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.data) {
                    this.summaryData = data.data;
                    this.displaySummary(data.data.summary);
                    this.displayTranscript(data.data.transcript);                    this.summarizeBtn.textContent = '🔄 Regenerate Analysis';
                    return;
                }
            }
        } catch (error) {
            // No existing summary available - that's fine
        }
    }
    
    async generateSummary() {
        if (this.isGeneratingSummary) return;

        // Check if this is a regeneration
        const isRegeneration = this.summaryData !== null;

        this.isGeneratingSummary = true;
        this.summarizeBtn.disabled = true;
        this.summarizeBtn.textContent = isRegeneration ? '⏳ Regenerating...' : '⏳ Generating...';
        
        // Show loading in both tabs
        this.summaryContent.innerHTML = `
            <div class="summary-loading">
                <div class="loading-spinner"></div>
                <span>${isRegeneration ? 'Regenerating AI analysis...' : 'Generating AI analysis...'} This may take a few minutes.</span>
            </div>
        `;
        
        this.transcriptContent.innerHTML = `
            <div class="summary-loading">
                <div class="loading-spinner"></div>
                <span>Transcribing audio...</span>
            </div>
        `;

        try {
            const response = await fetch('/transcribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    filename: this.filename,
                    force_regenerate: isRegeneration
                })
            });

            const data = await response.json();

            if (data.success) {
                this.summaryData = data.data;
                this.displaySummary(data.data.summary);
                this.displayTranscript(data.data.transcript);
                this.summarizeBtn.textContent = '🔄 Regenerate Analysis';
                
                // Show success message briefly
                if (!data.cached) {
                    this.summarizeBtn.textContent = '✅ Analysis Generated';
                    setTimeout(() => {
                        this.summarizeBtn.textContent = '🔄 Regenerate Analysis';
                    }, 3000);
                }
            } else {
                throw new Error(data.error || 'Failed to generate analysis');
            }        } catch (error) {
            this.summaryContent.innerHTML = `
                <div class="summary-error">
                    <strong>❌ Analysis Generation Failed</strong><br>
                    ${error.message || 'An unexpected error occurred. Please try again.'}
                </div>
            `;
            this.transcriptContent.innerHTML = `
                <div class="summary-error">
                    <strong>❌ Transcription Failed</strong><br>
                    ${error.message || 'An unexpected error occurred. Please try again.'}
                </div>
            `;
            this.summarizeBtn.textContent = '🔄 Try Again';
        } finally {
            this.isGeneratingSummary = false;
            this.summarizeBtn.disabled = false;
        }
    }displaySummary(summaryText) {
        // Convert markdown to HTML (basic implementation)
        const htmlContent = this.markdownToHtml(summaryText);
        this.summaryContent.innerHTML = `<div class="summary-text">${htmlContent}</div>`;
    }

    displayTranscript(transcriptText) {
        // Display raw transcript text
        this.transcriptContent.innerHTML = `<div class="transcript-text">${this.escapeHtml(transcriptText)}</div>`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }    markdownToHtml(markdown) {
        let html = markdown;
        
        // Escape HTML characters first
        html = html.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
        
        // Horizontal rules - handle various forms
        html = html.replace(/^[-*_]{3,}$/gim, '<hr>');
        html = html.replace(/^\s*[-*_\s]{3,}$/gim, '<hr>');
        
        // Headers (in order of specificity)
        html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
        html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold and italic (order matters)
        html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
        
        // Strikethrough
        html = html.replace(/~~(.*?)~~/gim, '<del>$1</del>');
        
        // Code blocks and inline code
        html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
        html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
        
        // Blockquotes
        html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Tables (basic support)
        html = this.parseMarkdownTables(html);
        
        // Lists - more robust handling
        html = this.parseMarkdownLists(html);
        
        // Paragraphs - split by double newlines
        const paragraphs = html.split(/\n\s*\n/);
        const htmlParagraphs = paragraphs.map(para => {
            const trimmed = para.trim();
            if (!trimmed) return '';
            
            // Don't wrap certain elements in paragraphs
            if (trimmed.startsWith('<h') || 
                trimmed.startsWith('<ul>') || 
                trimmed.startsWith('<ol>') || 
                trimmed.startsWith('<blockquote>') ||
                trimmed.startsWith('<pre>') ||
                trimmed.startsWith('<hr>') ||
                trimmed.startsWith('<table>')) {
                return trimmed;
            }
            
            return `<p>${trimmed}</p>`;
        });
        
        html = htmlParagraphs.filter(p => p).join('\n\n');
        
        // Clean up extra newlines and spacing
        html = html.replace(/\n+/g, '\n').trim();
        
        return html;
    }

    parseMarkdownLists(html) {
        const lines = html.split('\n');
        let inList = false;
        let listType = null;
        const processedLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Detect list items
            const bulletMatch = trimmedLine.match(/^[-*+] (.+)$/);
            const numberedMatch = trimmedLine.match(/^\d+\. (.+)$/);
            
            if (bulletMatch || numberedMatch) {
                const content = bulletMatch ? bulletMatch[1] : numberedMatch[1];
                const currentListType = bulletMatch ? 'ul' : 'ol';
                
                if (!inList) {
                    processedLines.push(`<${currentListType}>`);
                    inList = true;
                    listType = currentListType;
                } else if (listType !== currentListType) {
                    processedLines.push(`</${listType}>`);
                    processedLines.push(`<${currentListType}>`);
                    listType = currentListType;
                }
                
                processedLines.push(`<li>${content}</li>`);
            } else {
                if (inList) {
                    processedLines.push(`</${listType}>`);
                    inList = false;
                    listType = null;
                }
                processedLines.push(line);
            }
        }
        
        // Close any remaining list
        if (inList) {
            processedLines.push(`</${listType}>`);
        }
        
        return processedLines.join('\n');
    }

    parseMarkdownTables(html) {
        // Basic table parsing
        const lines = html.split('\n');
        const processedLines = [];
        let inTable = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check if line looks like a table row
            if (line.includes('|') && line.split('|').length > 2) {
                if (!inTable) {
                    processedLines.push('<table>');
                    inTable = true;
                }
                
                const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
                
                // Check if this is a header separator line
                if (cells.every(cell => /^[-:]+$/.test(cell))) {
                    continue; // Skip separator line
                }
                
                const isHeader = i === 0 || !inTable;
                const tag = isHeader ? 'th' : 'td';
                const rowHtml = cells.map(cell => `<${tag}>${cell}</${tag}>`).join('');
                processedLines.push(`<tr>${rowHtml}</tr>`);
            } else {
                if (inTable) {
                    processedLines.push('</table>');
                    inTable = false;
                }
                processedLines.push(line);
            }
        }
        
        if (inTable) {
            processedLines.push('</table>');
        }
        
        return processedLines.join('\n');
    }

    showError(message) {
        this.loading.style.display = 'none';
        this.videoContainer.style.display = 'none';
        this.error.style.display = 'flex';
        this.errorMessage.textContent = message;
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        } else {
            return `${m}:${s.toString().padStart(2, '0')}`;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize player when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VideoPlayer();
});
