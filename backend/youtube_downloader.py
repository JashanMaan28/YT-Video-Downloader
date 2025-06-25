import yt_dlp
import os
import requests
import time
import json

def download_youtube_video(url, save_path):
    """Downloads a YouTube video and thumbnail, returns metadata."""
    try:
        thumbnails_path = os.path.join(save_path, 'thumbnails')
        if not os.path.exists(thumbnails_path):
            os.makedirs(thumbnails_path)
            
        ydl_opts = {
            'outtmpl': f'{save_path}/%(title)s.%(ext)s',
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'writethumbnail': False,
            'writeinfojson': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            video_filename = ydl.prepare_filename(info)
            
            metadata = extract_metadata(info, url)
            ydl.download([url])
            
            thumbnail_path = download_thumbnail(info, thumbnails_path)
            save_detailed_metadata(video_filename, metadata, thumbnail_path)
            
            if os.path.exists(video_filename):
                return {
                    'video_path': video_filename,
                    'thumbnail_path': thumbnail_path,
                    'metadata': metadata,
                    'success': True
                }
            else:
                return {'success': False, 'error': 'File not found after download'}
                
    except Exception as e:
        return {'success': False, 'error': str(e)}

def extract_metadata(info, url):
    """Extract metadata from video info."""
    return {
        'title': info.get('title', 'Unknown Title'),
        'video_id': info.get('id', 'unknown'),
        'duration': info.get('duration', 0),
        'view_count': info.get('view_count', 0),
        'upload_date': info.get('upload_date', ''),
        'uploader': info.get('uploader', 'Unknown'),
        'description': info.get('description', 'No description available.'),
        'url': url,
        'video_filename': None,
        'thumbnail_filename': None,
        'download_timestamp': time.time()
    }

def download_thumbnail(info, thumbnails_path):
    """Download video thumbnail."""
    thumbnail_url = info.get('thumbnail')
    if not thumbnail_url:
        return None
        
    try:
        title = info.get('title', 'Unknown Title')
        video_id = info.get('id', 'unknown')
        safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).rstrip()[:50]
        thumbnail_filename = f"{safe_title}_{video_id}.jpg"
        thumbnail_path = os.path.join(thumbnails_path, thumbnail_filename)
        
        response = requests.get(thumbnail_url, stream=True)
        if response.status_code == 200:
            with open(thumbnail_path, 'wb') as thumb_file:
                for chunk in response.iter_content(chunk_size=8192):
                    thumb_file.write(chunk)
            return thumbnail_path
    except Exception:
        pass
    return None

def save_detailed_metadata(video_filename, metadata, thumbnail_path):
    """Save detailed metadata as JSON file."""
    metadata_file = os.path.splitext(video_filename)[0] + '_metadata.json'
    metadata['video_filename'] = os.path.basename(video_filename)
    metadata['thumbnail_filename'] = os.path.basename(thumbnail_path) if thumbnail_path else None
    
    try:
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
    except Exception:
        pass
