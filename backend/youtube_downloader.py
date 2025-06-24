import yt_dlp
import os

def download_youtube_video(url, save_path):
    """
    Downloads a YouTube video from the given URL and saves it to the specified path.

    Args:
        url (str): The URL of the YouTube video.
        save_path (str): The directory where the video will be saved.

    Returns:
        str: The file path of the downloaded video.
    """
    try:
        # Set up yt-dlp options
        ydl_opts = {
            'outtmpl': f'{save_path}/%(title)s.%(ext)s',
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract info first to get the filename
            info = ydl.extract_info(url, download=False)
            filename = ydl.prepare_filename(info)
            
            # Now download the video
            ydl.download([url])
            
            # Check if file exists
            if os.path.exists(filename):
                print(f"Video downloaded successfully: {filename}")
                return filename
            else:
                print("Download completed but file not found at expected location.")
                return None
                
    except Exception as e:
        print(f"An error occurred: {e}")
        return None
