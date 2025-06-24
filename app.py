from flask import Flask, render_template, request, send_from_directory, jsonify
from backend.youtube_downloader import download_youtube_video
import os
import json

app = Flask(__name__, static_folder='frontend/static', template_folder='frontend')

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(app.static_folder, filename)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/player.html')
def player():
    return render_template('player.html')

@app.route('/download', methods=['POST'])
def download():
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({"error": "Invalid request. URL is required."}), 400

    url = data['url']
    save_path = './Downloads'  # Fixed save path to ./Downloads

    # Ensure the save directory exists
    if not os.path.exists(save_path):
        os.makedirs(save_path)

    try:        # Call the download function
        result = download_youtube_video(url, save_path)
        
        if result and result.get('success'):
            metadata = result.get('metadata', {})
            thumbnail_filename = metadata.get('thumbnail_filename')
            
            return jsonify({
                "message": f"Video downloaded successfully to {save_path}!",
                "filename": metadata.get('video_filename', 'Unknown'),
                "title": metadata.get('title', 'Unknown Title'),
                "thumbnail_url": f"/thumbnails/{thumbnail_filename}" if thumbnail_filename else None,
                "video_id": metadata.get('video_id'),
                "duration": metadata.get('duration'),
                "uploader": metadata.get('uploader'),
                "success": True
            })
        else:
            error_msg = result.get('error', 'Failed to download the video. Please check the URL and try again.')
            return jsonify({"error": error_msg}), 500
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@app.route('/videos', methods=['GET'])
def get_videos():
    save_path = './Downloads'

    # Ensure the save directory exists
    if not os.path.exists(save_path):
        os.makedirs(save_path)

    # Get list of video files (exclude metadata files)
    video_files = [f for f in os.listdir(save_path) 
                   if os.path.isfile(os.path.join(save_path, f)) 
                   and not f.endswith('.json') 
                   and not f.endswith('.webp')
                   and not f.endswith('.jpg')
                   and f != 'thumbnails']

    # Prepare video details with thumbnail information
    videos = []
    thumbnails_path = os.path.join(save_path, 'thumbnails')
    
    for video in video_files:
        video_path = os.path.join(save_path, video)
        video_name = os.path.splitext(video)[0]
        
        # Initialize default values
        thumbnail_url = None
        duration = None
        uploader = None
        title = video_name  # Default title        # Look for matching thumbnail with improved matching logic
        if os.path.exists(thumbnails_path):
            thumbnail_files = [f for f in os.listdir(thumbnails_path) if f.endswith('.jpg')]
            
            for thumb_file in thumbnail_files:
                # Remove extension from thumbnail for comparison
                thumb_name = os.path.splitext(thumb_file)[0]
                
                # Clean and normalize strings for comparison
                video_clean = ''.join(c for c in video_name.lower() if c.isalnum() or c.isspace()).strip()
                thumb_clean = ''.join(c for c in thumb_name.lower() if c.isalnum() or c.isspace()).strip()
                
                # Multiple matching strategies
                video_words = set(word for word in video_clean.split() if len(word) > 3)
                thumb_words = set(word for word in thumb_clean.split() if len(word) > 3)
                
                # Calculate word overlap
                common_words = video_words.intersection(thumb_words)
                word_overlap = len(common_words) / max(len(video_words), 1) if video_words else 0
                
                # Match if significant word overlap (>30%) or direct substring match
                if (word_overlap > 0.3 or 
                    video_clean in thumb_clean or 
                    thumb_clean in video_clean or
                    any(word in video_clean for word in thumb_clean.split() if len(word) > 5)):
                    
                    thumbnail_url = f"/thumbnails/{thumb_file}"
                    print(f"✅ Matched thumbnail {thumb_file} to video {video}")
                    break
        
        videos.append({
            "title": title,
            "filename": video,
            "downloadDate": os.path.getctime(video_path),
            "fileSize": os.path.getsize(video_path),
            "thumbnail": thumbnail_url,
            "duration": duration,
            "uploader": uploader
        })

    return jsonify(videos)

@app.route('/Downloads/<path:filename>')
def serve_video(filename):
    save_path = './Downloads'
    full_path = os.path.join(save_path, filename)
    
    print(f"Serving video: {filename}")
    print(f"Full path: {full_path}")
    print(f"File exists: {os.path.exists(full_path)}")
    
    if os.path.exists(full_path):
        return send_from_directory(save_path, filename)
    else:
        return "Video file not found", 404

@app.route('/thumbnails/<path:filename>')
def serve_thumbnail(filename):
    thumbnails_path = './Downloads/thumbnails'
    full_path = os.path.join(thumbnails_path, filename)
    
    print(f"Serving thumbnail: {filename}")
    print(f"Full path: {full_path}")
    print(f"File exists: {os.path.exists(full_path)}")
    
    if os.path.exists(full_path):
        return send_from_directory(thumbnails_path, filename)
    else:
        # Return a default placeholder image or 404
        return "Thumbnail not found", 404

@app.route('/debug/files')
def debug_files():
    save_path = './Downloads'
    if not os.path.exists(save_path):
        return jsonify({"error": "Downloads directory does not exist"})
    
    files = []
    for file in os.listdir(save_path):
        file_path = os.path.join(save_path, file)
        if os.path.isfile(file_path):
            files.append({
                "name": file,
                "size": os.path.getsize(file_path),
                "full_path": os.path.abspath(file_path)
            })
    
    return jsonify({
        "downloads_path": os.path.abspath(save_path),
        "files": files
    })

@app.route('/cleanup', methods=['POST'])
def cleanup_files():
    """Clean up extra JSON and WEBP files created by yt-dlp"""
    save_path = './Downloads'
    
    if not os.path.exists(save_path):
        return jsonify({"message": "Downloads directory does not exist"})
    
    cleaned_files = []
    
    try:
        for filename in os.listdir(save_path):
            file_path = os.path.join(save_path, filename)
            
            # Remove JSON metadata files and WEBP thumbnails
            if (filename.endswith('.json') or 
                filename.endswith('.webp') or 
                filename.endswith('.info.json') or
                filename.endswith('.description')):
                
                try:
                    os.remove(file_path)
                    cleaned_files.append(filename)
                    print(f"Removed: {filename}")
                except Exception as e:
                    print(f"Error removing {filename}: {e}")
        
        return jsonify({
            "message": f"Cleanup completed. Removed {len(cleaned_files)} files.",
            "removed_files": cleaned_files
        })
        
    except Exception as e:
        return jsonify({"error": f"Cleanup failed: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)
