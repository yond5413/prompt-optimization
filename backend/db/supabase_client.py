import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load .env.local file from backend directory
backend_dir = Path(__file__).parent.parent
load_dotenv(dotenv_path=backend_dir / ".env.local")

supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_KEY must be set in environment variables")

supabase: Client = create_client(supabase_url, supabase_key)

