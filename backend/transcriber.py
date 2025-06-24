import os
import tempfile
from moviepy.editor import VideoFileClip
import whisper
from groq import Groq
from dotenv import dotenv_values

# Load Groq API key from environment variables
env_vars = dotenv_values(".env")
GroqAPIKey = env_vars.get("GROQ_API_KEY")
client = Groq(api_key=GroqAPIKey)

# Load Whisper model
whisper_model = whisper.load_model('base')

def video_to_audio(video_path):
    """Extract audio from video and return path to temp audio file."""
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_audio:
        clip = VideoFileClip(video_path)
        clip.audio.write_audiofile(temp_audio.name, verbose=False, logger=None)
        clip.close()
        return temp_audio.name

def transcribe_audio(audio_path):
    """Transcribe audio using Whisper."""
    result = whisper_model.transcribe(audio_path)
    return result['text']

def summarize_transcript(transcript):
    """Send transcript to Groq API and get markdown summary."""
    prompt = f"""Generate a concise yet comprehensive summary of the provided transcript, capturing all key points, main ideas, and critical details accurately. Use the same language as the transcript to maintain consistency and preserve nuance. Ensure the summary is well-structured, easy to understand, and avoids unnecessary elaboration or extraneous information. If the transcript contains ambiguous or incomplete sections, make reasonable inferences based on context, and briefly note any assumptions made. When applicable, leverage available tools or context to enhance the accuracy and relevance of the summary, and explain the process briefly if external resources are used. Prioritize clarity and user-friendly language to make the summary accessible to a broad audience.

Format the summary in markdown with clear sections and structure where appropriate.

Transcript:
{transcript}"""
    
    response = client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1024,
        temperature=0.5
    )
    
    return response.choices[0].message.content

def process_video(video_path):
    """Process video: extract audio -> transcribe -> summarize."""
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    
    audio_path = video_to_audio(video_path)
    
    try:
        transcript = transcribe_audio(audio_path)
        summary = summarize_transcript(transcript)
        return {
            'transcript': transcript,
            'summary': summary
        }
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)
