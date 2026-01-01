import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load .env.local file from backend directory (for local development)
backend_dir = Path(__file__).parent.parent
env_local_path = backend_dir / ".env.local"
if env_local_path.exists():
    load_dotenv(dotenv_path=env_local_path)
else:
    # Fallback to standard .env or system variables
    load_dotenv()

supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    # In production (Render), these should be set in the Dashboard
    raise ValueError("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_KEY must be set in environment variables")

supabase: Client = create_client(supabase_url, supabase_key)

