import yt_dlp
import os
import requests

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
            'writeinfojson': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            video_filename = ydl.prepare_filename(info)
            
            title = info.get('title', 'Unknown Title')
            video_id = info.get('id', 'unknown')
            duration = info.get('duration', 0)
            view_count = info.get('view_count', 0)
            upload_date = info.get('upload_date', '')
            uploader = info.get('uploader', 'Unknown')
            
            ydl.download([url])
            
            thumbnail_path = None
            thumbnail_url = info.get('thumbnail')
            if thumbnail_url:
                try:
                    safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).rstrip()[:50]
                    thumbnail_filename = f"{safe_title}_{video_id}.jpg"
                    thumbnail_path = os.path.join(thumbnails_path, thumbnail_filename)
                    
                    response = requests.get(thumbnail_url, stream=True)
                    if response.status_code == 200:
                        with open(thumbnail_path, 'wb') as thumb_file:
                            for chunk in response.iter_content(chunk_size=8192):
                                thumb_file.write(chunk)
                    else:
                        thumbnail_path = None
                except Exception:
                    thumbnail_path = None
            
            if os.path.exists(video_filename):
                metadata = {
                    'title': title,
                    'video_id': video_id,
                    'duration': duration,
                    'view_count': view_count,
                    'upload_date': upload_date,
                    'uploader': uploader,
                    'thumbnail_filename': os.path.basename(thumbnail_path) if thumbnail_path else None,
                    'video_filename': os.path.basename(video_filename),
                    'url': url
                }
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
