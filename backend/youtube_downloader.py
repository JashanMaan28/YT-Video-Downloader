import yt_dlp

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
            'outtmpl': f'{save_path}/%(title)s.%(ext)s',  # Save with video title as filename
            'format': 'bestvideo+bestaudio/best',  # Best quality video and audio
        }

        # Download the video
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        print("Video downloaded successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")

# Example usage
if __name__ == "__main__":
    video_url = input("Enter the YouTube video URL: ")
    save_directory = input("Enter the directory to save the video: ")
    download_youtube_video(video_url, save_directory)
