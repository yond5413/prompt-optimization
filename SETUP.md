# Setup Instructions

## Quick Start

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
uvicorn main:app --reload --port 8000
```

### 2. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor
3. Copy and paste the contents of `backend/supabase_schema.sql`
4. Run the SQL to create all tables
5. Go to Storage and create a bucket named "datasets"
6. Copy your Supabase URL and anon key to `.env` files

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your API URL and Supabase credentials
npm run dev
```

### 4. Environment Variables

**Backend (.env)**:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key
OPENROUTER_API_KEY=your_openrouter_key
BACKEND_URL=http://localhost:8000
```

**Frontend (.env.local)**:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Testing the Setup

1. Backend health check: `curl http://localhost:8000/api/health`
2. Frontend: Open http://localhost:3000
3. Create a prompt via the UI
4. Upload a dataset
5. Run an evaluation

## Troubleshooting

- **Import errors**: Make sure you're running uvicorn from the `backend/` directory
- **CORS errors**: Check that `NEXT_PUBLIC_API_URL` matches your backend URL
- **Database errors**: Verify Supabase credentials and that tables were created
- **LLM errors**: Check OpenRouter API key is valid

