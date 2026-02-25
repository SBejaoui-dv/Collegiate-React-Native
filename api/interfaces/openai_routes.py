import json
import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from flask import Blueprint, jsonify, request
from openai import OpenAI

API_ENV_PATH = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(API_ENV_PATH)

openai_routes = Blueprint('openai_routes', __name__, url_prefix='/api/openai')

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')


def get_client() -> OpenAI:
  if not OPENAI_API_KEY:
    raise ValueError('Missing OPENAI_API_KEY in api/.env')
  return OpenAI(api_key=OPENAI_API_KEY)


def build_resume_feedback_prompt(resume_text: str) -> str:
  return (
    'Review this student resume and provide practical, actionable feedback for college applications. '
    'Focus on content impact, clarity, formatting, and what to improve immediately. '
    'Use concise markdown with sections: Summary, Strengths, Improvements, and Priority Edits.\\n\\n'
    f'Resume:\\n{resume_text}'
  )


def analyze_resume_with_ai(resume_text: str) -> str:
  client = get_client()
  completion = client.chat.completions.create(
    model=OPENAI_MODEL,
    messages=[
      {
        'role': 'system',
        'content': 'You are an expert college admissions and resume coach. Give specific, actionable advice.',
      },
      {
        'role': 'user',
        'content': build_resume_feedback_prompt(resume_text),
      },
    ],
    temperature=0.4,
    max_tokens=900,
  )
  return (completion.choices[0].message.content or '').strip()


def extract_text_from_uploaded_file(file_path: str, filename: str) -> str:
  extension = os.path.splitext(filename)[1].lower()

  if extension == '.pdf':
    try:
      from PyPDF2 import PdfReader
    except Exception as exc:
      raise ValueError('PDF support requires PyPDF2. Run api setup again.') from exc

    reader = PdfReader(file_path)
    return '\n'.join([(page.extract_text() or '') for page in reader.pages]).strip()

  if extension == '.docx':
    try:
      from docx import Document
    except Exception as exc:
      raise ValueError('DOCX support requires python-docx. Run api setup again.') from exc

    document = Document(file_path)
    return '\n'.join([paragraph.text for paragraph in document.paragraphs]).strip()

  with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
    return file.read().strip()


@openai_routes.route('/generate-outline', methods=['POST'])
def generate_outline():
  payload = request.get_json(silent=True) or {}

  if not any(payload.values()):
    return jsonify({'error': 'Missing responses'}), 400

  try:
    client = get_client()

    prompt = (
      'Generate a strong college personal statement outline from these responses. '
      'Return concise markdown with: Hook, Core Story, Reflection, Why College, and Closing.\\n\\n'
      f"About me: {payload.get('aboutYourself', '')}\\n"
      f"Unique quality: {payload.get('uniqueQuality', '')}\\n"
      f"Story about loved one: {payload.get('storyAboutLovedOne', '')}\\n"
      f"What colleges should know: {payload.get('collegeInfo', '')}"
    )

    completion = client.chat.completions.create(
      model=OPENAI_MODEL,
      messages=[
        {
          'role': 'system',
          'content': 'You are an expert college admissions essay coach. Keep output practical and specific.'
        },
        {'role': 'user', 'content': prompt},
      ],
      temperature=0.6,
      max_tokens=700,
    )

    outline_text = completion.choices[0].message.content or ''
    outline = {
      'introduction': payload.get('aboutYourself', ''),
      'uniqueTrait': payload.get('uniqueQuality', ''),
      'story': payload.get('storyAboutLovedOne', ''),
      'collegeGoal': payload.get('collegeInfo', ''),
      'aiOutline': outline_text.strip(),
    }

    return jsonify({'outline': outline}), 200
  except Exception as exc:
    return jsonify({'error': str(exc)}), 500


@openai_routes.route('/grade-essay', methods=['POST'])
def grade_essay():
  payload = request.get_json(silent=True) or {}
  essay = (payload.get('essay') or '').strip()
  context = (payload.get('context') or '').strip()

  if not essay:
    return jsonify({'error': "Missing 'essay' in request body"}), 400

  word_count = len([word for word in essay.split() if word])
  char_count = len(essay)

  rubric_weights = {
    'clarity_and_thesis': 0.18,
    'voice_and_authenticity': 0.18,
    'structure_and_flow': 0.18,
    'evidence_and_specificity': 0.16,
    'style_and_readability': 0.14,
    'mechanics_and_grammar': 0.10,
    'impact_and_memorability': 0.06,
  }

  try:
    client = get_client()

    completion = client.chat.completions.create(
      model=OPENAI_MODEL,
      response_format={'type': 'json_object'},
      temperature=0.2,
      max_tokens=1200,
      messages=[
        {
          'role': 'system',
          'content': (
            'You are an expert college admissions essay grader. '
            'Return only valid JSON and follow the requested schema exactly.'
          ),
        },
        {
          'role': 'user',
          'content': json.dumps(
            {
              'essay': essay,
              'context': context,
              'meta': {'word_count': word_count, 'char_count': char_count},
              'rubric_weights': rubric_weights,
              'return_schema': {
                'score': 'number 0-10',
                'summary': 'string',
                'rubric_scores': {
                  'clarity_and_thesis': {'score': 'number', 'reason': 'string'},
                  'voice_and_authenticity': {'score': 'number', 'reason': 'string'},
                  'structure_and_flow': {'score': 'number', 'reason': 'string'},
                  'evidence_and_specificity': {'score': 'number', 'reason': 'string'},
                  'style_and_readability': {'score': 'number', 'reason': 'string'},
                  'mechanics_and_grammar': {'score': 'number', 'reason': 'string'},
                  'impact_and_memorability': {'score': 'number', 'reason': 'string'},
                },
                'strengths': ['string'],
                'weaknesses': ['string'],
                'priority_fixes': [
                  {
                    'issue': 'string',
                    'why_it_matters': 'string',
                    'how_to_fix': 'string',
                    'before_example': 'string',
                    'after_example': 'string',
                  }
                ],
              },
            }
          ),
        },
      ],
    )

    raw = completion.choices[0].message.content or '{}'
    result = json.loads(raw)

    return jsonify(
      {
        'score': result.get('score', 0),
        'summary': result.get('summary', ''),
        'rubric_scores': result.get('rubric_scores', {}),
        'strengths': result.get('strengths', []),
        'weaknesses': result.get('weaknesses', []),
        'priority_fixes': result.get('priority_fixes', []),
        'meta': {'word_count': word_count, 'char_count': char_count},
      }
    ), 200
  except Exception as exc:
    return jsonify({'error': str(exc)}), 500


@openai_routes.route('/analyze-resume', methods=['POST'])
def analyze_resume():
  payload = request.get_json(silent=True) or {}
  resume_text = (payload.get('resume_text') or '').strip()

  if not resume_text:
    return jsonify({'error': "Missing 'resume_text' in request body"}), 400

  try:
    feedback = analyze_resume_with_ai(resume_text)
    return jsonify({'feedback': feedback}), 200
  except Exception as exc:
    return jsonify({'error': str(exc)}), 500


@openai_routes.route('/upload-resume', methods=['POST'])
def upload_resume():
  if 'resume' not in request.files:
    return jsonify({'error': "Missing 'resume' file in form data"}), 400

  resume_file = request.files['resume']
  if not resume_file.filename:
    return jsonify({'error': 'Missing uploaded filename'}), 400

  try:
    extension = os.path.splitext(resume_file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as temp_file:
      temp_file.write(resume_file.read())
      temp_path = temp_file.name

    try:
      resume_text = extract_text_from_uploaded_file(temp_path, resume_file.filename)
    finally:
      os.remove(temp_path)

    if not resume_text:
      return jsonify({'error': 'Could not extract readable text from this file.'}), 400

    feedback = analyze_resume_with_ai(resume_text)
    return jsonify({'feedback': feedback}), 200
  except Exception as exc:
    return jsonify({'error': str(exc)}), 500
