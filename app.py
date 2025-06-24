from flask import Flask, render_template, request, redirect, url_for, send_from_directory
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
    url = request.form['url']
    save_path = request.form['save_path']

    # Ensure the save directory exists
    if not os.path.exists(save_path):
        os.makedirs(save_path)

    # Call the download function
    result = download_youtube_video(url, save_path)

    if result:
        return f"Video downloaded successfully to {save_path}!"
    else:
        return "An error occurred while downloading the video."

if __name__ == '__main__':
    app.run(debug=True)
