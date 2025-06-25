from flask import Flask, render_template, request, send_from_directory, jsonify
from backend.youtube_downloader import download_youtube_video
from backend.transcriber import process_video, load_summary
import os
import json
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
    save_path = './Downloads'

    if not os.path.exists(save_path):
        os.makedirs(save_path)

    try:
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
    if not os.path.exists(save_path):
        os.makedirs(save_path)

    video_files = [f for f in os.listdir(save_path) 
                   if os.path.isfile(os.path.join(save_path, f)) 
                   and not f.endswith('.json') 
                   and not f.endswith('.webp')
                   and not f.endswith('.jpg')
                   and f != 'thumbnails']

    videos = []
    thumbnails_path = os.path.join(save_path, 'thumbnails')
    
    for video in video_files:
        video_path = os.path.join(save_path, video)
        video_name = os.path.splitext(video)[0]
        thumbnail_url = None
        
        # Find matching thumbnail using word overlap algorithm
        if os.path.exists(thumbnails_path):
            thumbnail_files = [f for f in os.listdir(thumbnails_path) if f.endswith('.jpg')]
            
            for thumb_file in thumbnail_files:
                thumb_name = os.path.splitext(thumb_file)[0]
                video_clean = ''.join(c for c in video_name.lower() if c.isalnum() or c.isspace()).strip()
                thumb_clean = ''.join(c for c in thumb_name.lower() if c.isalnum() or c.isspace()).strip()
                
                video_words = set(word for word in video_clean.split() if len(word) > 3)
                thumb_words = set(word for word in thumb_clean.split() if len(word) > 3)
                common_words = video_words.intersection(thumb_words)
                word_overlap = len(common_words) / max(len(video_words), 1) if video_words else 0
                
                if (word_overlap > 0.3 or video_clean in thumb_clean or thumb_clean in video_clean):
                    thumbnail_url = f"/thumbnails/{thumb_file}"
                    break
        
        videos.append({
            "title": video_name,
            "filename": video,
            "downloadDate": os.path.getctime(video_path),
            "fileSize": os.path.getsize(video_path),
            "thumbnail": thumbnail_url,
            "duration": None,
            "uploader": None
        })

    return jsonify(videos)

@app.route('/Downloads/<path:filename>')
def serve_video(filename):
    save_path = './Downloads'
    if os.path.exists(os.path.join(save_path, filename)):
        return send_from_directory(save_path, filename)
    return "Video file not found", 404

@app.route('/thumbnails/<path:filename>')
def serve_thumbnail(filename):
    thumbnails_path = './Downloads/thumbnails'
    if os.path.exists(os.path.join(thumbnails_path, filename)):
        return send_from_directory(thumbnails_path, filename)
    return "Thumbnail not found", 404

@app.route('/transcribe', methods=['POST'])
def transcribe_video():
    data = request.get_json()
    if not data or 'filename' not in data:
        return jsonify({"error": "Video filename is required."}), 400
    
    filename = data['filename']
    force_regenerate = data.get('force_regenerate', False)
    video_path = os.path.join('./Downloads', filename)
    
    if not os.path.exists(video_path):
        return jsonify({"error": "Video file not found."}), 404
    
    try:
        if not force_regenerate:
            existing_summary = load_summary(video_path)
            if existing_summary:
                return jsonify({"success": True, "cached": True, "data": existing_summary})
        
        result = process_video(video_path, force_regenerate=force_regenerate)
        return jsonify({"success": True, "cached": False, "data": result})
        
    except Exception as e:
        return jsonify({"error": f"Transcription failed: {str(e)}"}), 500

@app.route('/summary/<filename>')
def get_summary(filename):
    video_path = os.path.join('./Downloads', filename)
    if not os.path.exists(video_path):
        return jsonify({"error": "Video file not found."}), 404
    
    summary_data = load_summary(video_path)
    if summary_data:
        return jsonify({"success": True, "data": summary_data})
    return jsonify({"success": False, "message": "No summary available for this video."})

@app.route('/metadata/<filename>')
def get_metadata(filename):
    video_path = os.path.join('./Downloads', filename)
    if not os.path.exists(video_path):
        return jsonify({"error": "Video file not found."}), 404
    
    # Try to load metadata file
    metadata_file = os.path.splitext(video_path)[0] + '_metadata.json'
    if os.path.exists(metadata_file):
        try:
            with open(metadata_file, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
                return jsonify({"success": True, "data": metadata})
        except Exception as e:
            return jsonify({"error": f"Failed to load metadata: {str(e)}"}), 500
    
    return jsonify({"success": False, "message": "No metadata available for this video."})

if __name__ == '__main__':
    app.run(debug=True)
