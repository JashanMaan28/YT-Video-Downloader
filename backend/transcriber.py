import os
import json
import time
import tempfile
from moviepy.editor import VideoFileClip
import whisper
from groq import Groq
from dotenv import dotenv_values

env_vars = dotenv_values(".env")
GroqAPIKey = env_vars.get("GROQ_API_KEY")
client = Groq(api_key=GroqAPIKey)
whisper_model = whisper.load_model('base')

def video_to_audio(video_path):
    """Extract audio from video and return path to temp audio file."""
    try:
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_audio:
            clip = VideoFileClip(video_path)
            duration = clip.duration
            
            clip.audio.write_audiofile(
                temp_audio.name, 
                verbose=False, 
                logger=None,
                codec='pcm_s16le',
                ffmpeg_params=['-ac', '1', '-ar', '16000']
            )
            clip.close()
            return temp_audio.name
    except Exception as e:
        raise Exception(f"Audio extraction failed: {str(e)}")

def transcribe_audio(audio_path):
    """Transcribe audio using Whisper with improved settings."""
    try:
        result = whisper_model.transcribe(
            audio_path,
            language=None,
            task="transcribe",
            verbose=False,
            word_timestamps=False,
            condition_on_previous_text=True,
            temperature=0,
            compression_ratio_threshold=2.4,
            logprob_threshold=-1.0,
            no_speech_threshold=0.6
        )
        return result['text']
    except Exception as e:
        raise Exception(f"Transcription failed: {str(e)}")

def summarize_transcript(transcript):
    """Send transcript to Groq API and get markdown summary."""
    max_chars = 8000
    
    if len(transcript) <= max_chars:
        return _summarize_chunk(transcript)
    
    chunks = []
    for i in range(0, len(transcript), max_chars):
        chunk = transcript[i:i + max_chars]
        chunks.append(chunk)
    
    chunk_summaries = []
    for i, chunk in enumerate(chunks):
        summary = _summarize_chunk(chunk, f"Part {i+1}/{len(chunks)}")
        chunk_summaries.append(summary)
    
    combined_summary = "\n\n".join(chunk_summaries)
    
    if len(chunks) > 1:
        final_prompt = f"""Create a final consolidated summary from the following part summaries of a video transcript. 
Organize the content logically, remove redundancy, and create a coherent narrative structure. Do not repeat information across parts and also do not state that this is from a video transcript.

Use proper markdown formatting:
- Clear headers (# ## ###)
- Bullet points for lists
- **bold** for emphasis
- No horizontal rules or separators

Part Summaries:
{combined_summary}"""
        
        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": final_prompt}],
            max_tokens=2048,
            temperature=0.3
        )
        
        return response.choices[0].message.content
    
    return combined_summary

def _summarize_chunk(transcript, part_label=""):
    """Summarize a single chunk of transcript."""
    prompt = f"""Create a comprehensive and well-structured summary of the provided video transcript{' ' + part_label if part_label else ''}. Follow these guidelines:

FORMATTING REQUIREMENTS:
- Use proper markdown formatting with headers (# ## ###)
- Use bullet points for lists (- or *)
- Use **bold** for emphasis and *italics* for subtle emphasis
- Do NOT use horizontal rules or separators like --- or ===
- Keep paragraphs concise and well-spaced

CONTENT REQUIREMENTS:
- Extract and organize key points, main ideas, and important details
- Maintain the original language and tone of the transcript
- Create clear sections with descriptive headers
- Include specific examples, numbers, or quotes when mentioned
- Summarize complex concepts in accessible language
- Do not state that this is a summary of a video transcript

STRUCTURE:
1. Brief overview/introduction
2. Main topics organized under clear headers
3. Key takeaways or conclusions
4. Any actionable insights or recommendations mentioned

Make the summary informative, engaging, and easy to scan. Focus on value and clarity.

Transcript:
{transcript}"""
    
    response = client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2048,
        temperature=0.3
    )
    
    return response.choices[0].message.content

def save_summary(video_path, summary_data):
    """Save summary data to a JSON file in the summaries folder."""
    try:
        video_dir = os.path.dirname(video_path)
        summaries_dir = os.path.join(video_dir, 'summaries')
        
        if not os.path.exists(summaries_dir):
            os.makedirs(summaries_dir)
        
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        summary_file = os.path.join(summaries_dir, f"{base_name}_summary.json")
        
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary_data, f, indent=2, ensure_ascii=False)
        
        return summary_file
    except Exception as e:
        return None

def load_summary(video_path):
    """Load existing summary data if available from the summaries folder."""
    try:
        video_dir = os.path.dirname(video_path)
        summaries_dir = os.path.join(video_dir, 'summaries')
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        summary_file = os.path.join(summaries_dir, f"{base_name}_summary.json")
        
        if os.path.exists(summary_file):
            with open(summary_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict) and 'summary' in data and 'transcript' in data:
                    return data
    except Exception as e:
        pass
    
    return None

def process_video(video_path, force_regenerate=False):
    """Process video: extract audio -> transcribe -> summarize."""
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    
    if not force_regenerate:
        existing_summary = load_summary(video_path)
        if existing_summary:
            return existing_summary
    
    audio_path = video_to_audio(video_path)
    
    try:
        transcript = transcribe_audio(audio_path)
        summary = summarize_transcript(transcript)
        
        result = {
            'transcript': transcript,
            'summary': summary,
            'processed_at': time.time(),
            'video_filename': os.path.basename(video_path),
            'force_regenerated': force_regenerate
        }
        
        save_summary(video_path, result)
        return result
    except Exception as e:
        raise
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)
