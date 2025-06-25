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

@app.route('/delete_video', methods=['DELETE'])
def delete_video():
    data = request.get_json()
    if not data or 'filename' not in data:
        return jsonify({"error": "Video filename is required."}), 400
    
    filename = data['filename']
    save_path = './Downloads'
    
    try:
        # Main video file path
        video_path = os.path.join(save_path, filename)
        
        if not os.path.exists(video_path):
            return jsonify({"error": "Video file not found."}), 404
        
        # Check if file is accessible before attempting deletion
        try:
            # Try to open the file to check if it's in use
            with open(video_path, 'r+b') as f:
                pass
        except PermissionError:
            return jsonify({"error": f"Video file '{filename}' is currently in use. Please close any media players and try again."}), 423
        except Exception as e:
            return jsonify({"error": f"Cannot access video file '{filename}': {str(e)}"}), 403
        
        # Files to delete
        files_deleted = []
        errors = []
        
        # Delete main video file (try multiple times if needed)
        video_deleted = False
        for attempt in range(3):
            try:
                if os.path.exists(video_path):
                    os.remove(video_path)
                    files_deleted.append(f"Video: {filename}")
                    video_deleted = True
                    break
            except PermissionError as e:
                if attempt == 2:  # Last attempt - try Windows force delete
                    try:
                        import subprocess
                        import platform
                        if platform.system() == "Windows":
                            # Use Windows del command with force flag
                            result = subprocess.run(['del', '/f', '/q', video_path], 
                                                  shell=True, capture_output=True, text=True)
                            if result.returncode == 0 and not os.path.exists(video_path):
                                files_deleted.append(f"Video: {filename}")
                                video_deleted = True
                                break
                        
                        errors.append(f"Permission denied: Video file may be open in another application - {str(e)}")
                    except Exception as force_e:
                        errors.append(f"Failed to force delete video file: {str(force_e)}")
                else:
                    import time
                    time.sleep(0.5)  # Wait 500ms before retry
            except Exception as e:
                errors.append(f"Failed to delete video file: {str(e)}")
                break
        
        # Delete associated files
        base_filename = os.path.splitext(filename)[0]
        
        # Delete metadata file
        metadata_file = os.path.join(save_path, base_filename + '_metadata.json')
        if os.path.exists(metadata_file):
            try:
                os.remove(metadata_file)
                files_deleted.append("Metadata file")
            except Exception as e:
                errors.append(f"Failed to delete metadata: {str(e)}")
        
        # Delete .info.json file (yt-dlp metadata)
        info_file = os.path.join(save_path, base_filename + '.info.json')
        if os.path.exists(info_file):
            try:
                os.remove(info_file)
                files_deleted.append("Info file")
            except Exception as e:
                errors.append(f"Failed to delete info file: {str(e)}")
        
        # Delete summary file
        summaries_path = os.path.join(save_path, 'summaries')
        summary_file = os.path.join(summaries_path, base_filename + '_summary.json')
        if os.path.exists(summary_file):
            try:
                os.remove(summary_file)
                files_deleted.append("Summary file")
            except Exception as e:
                errors.append(f"Failed to delete summary: {str(e)}")
        
        # Delete thumbnail - find matching thumbnail using similar logic as in get_videos
        thumbnails_path = os.path.join(save_path, 'thumbnails')
        if os.path.exists(thumbnails_path):
            thumbnail_files = [f for f in os.listdir(thumbnails_path) if f.endswith('.jpg')]
            
            for thumb_file in thumbnail_files:
                thumb_name = os.path.splitext(thumb_file)[0]
                video_clean = ''.join(c for c in base_filename.lower() if c.isalnum() or c.isspace()).strip()
                thumb_clean = ''.join(c for c in thumb_name.lower() if c.isalnum() or c.isspace()).strip()
                
                video_words = set(word for word in video_clean.split() if len(word) > 3)
                thumb_words = set(word for word in thumb_clean.split() if len(word) > 3)
                common_words = video_words.intersection(thumb_words)
                word_overlap = len(common_words) / max(len(video_words), 1) if video_words else 0
                
                if (word_overlap > 0.3 or video_clean in thumb_clean or thumb_clean in video_clean):
                    try:
                        os.remove(os.path.join(thumbnails_path, thumb_file))
                        files_deleted.append("Thumbnail image")
                        break
                    except Exception as e:
                        errors.append(f"Failed to delete thumbnail: {str(e)}")
        
        # Prepare response
        if video_deleted and not errors:
            return jsonify({
                "success": True,
                "message": f"Video '{filename}' and associated files deleted successfully.",
                "files_deleted": files_deleted
            })
        elif video_deleted and errors:
            return jsonify({
                "success": True,
                "message": f"Video '{filename}' deleted with some warnings.",
                "files_deleted": files_deleted,
                "warnings": errors
            })
        elif not video_deleted and files_deleted:
            return jsonify({
                "error": f"Failed to delete video file '{filename}', but associated files were removed.",
                "files_deleted": files_deleted,
                "errors": errors
            }), 500
        else:
            return jsonify({
                "error": "Failed to delete video and associated files.",
                "errors": errors
            }), 500
    
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)
