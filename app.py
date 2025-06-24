from flask import Flask, render_template, request, send_from_directory, jsonify
from backend.youtube_downloader import download_youtube_video
import os

app = Flask(__name__, static_folder='frontend/static', template_folder='frontend')

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(app.static_folder, filename)

@app.route('/')
def index():
    return render_template('index.html')

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

    try:
        # Call the download function
        result = download_youtube_video(url, save_path)

        if result:
            return jsonify({
                "message": f"Video downloaded successfully to {save_path}!",
                "filename": os.path.basename(result),
                "title": os.path.splitext(os.path.basename(result))[0]
            })
        else:
            return jsonify({"error": "Failed to download the video. Please check the URL and try again."}), 500
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@app.route('/videos', methods=['GET'])
def get_videos():
    save_path = './Downloads'

    # Ensure the save directory exists
    if not os.path.exists(save_path):
        os.makedirs(save_path)

    # Get list of video files
    video_files = [f for f in os.listdir(save_path) if os.path.isfile(os.path.join(save_path, f))]

    # Prepare video details
    videos = []
    for video in video_files:
        videos.append({
            "title": os.path.splitext(video)[0],
            "filename": video,
            "downloadDate": os.path.getctime(os.path.join(save_path, video))
        })

    return jsonify(videos)

@app.route('/Downloads/<path:filename>', methods=['GET'])
def serve_video(filename):
    save_path = './Downloads'
    return send_from_directory(save_path, filename)

if __name__ == '__main__':
    app.run(debug=True)
