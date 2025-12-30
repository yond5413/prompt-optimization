# Prompt Optimization Platform

A self-improving prompt optimization platform that treats prompts like code: versioned, testable, auditable, and continuously improved.

## Features

- **Prompt Versioning**: Immutable prompt versions with lineage tracking
- **Multi-dimensional Evaluation**: Correctness, format adherence, clarity, verbosity, consistency
- **Candidate Generation**: Meta-prompting and few-shot enhancement algorithms
- **Self-Improvement Loop**: Automated prompt optimization with promotion guardrails
- **Transparency**: Full audit trail with diffs and explanations

## Architecture

- **Frontend**: Next.js 16 with App Router, React 19, Tailwind CSS
- **Backend**: FastAPI (Python) for evaluation and generation tasks
- **Database**: Supabase (PostgreSQL)
- **LLM**: OpenRouter API

## Setup

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Supabase account
- OpenRouter API key

### Backend Setup

**Windows (PowerShell):**
```powershell
# Run the setup script
.\setup-backend.ps1

# Or manually:
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env  # If .env doesn't exist
# Edit .env with your credentials
uvicorn main:app --reload --port 8000
```

**Linux/Mac:**
1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file:
```bash
cp .env.example .env
```

5. Fill in your environment variables:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
OPENROUTER_API_KEY=your_openrouter_api_key
BACKEND_URL=http://localhost:8000
```

6. Set up Supabase database:
   - Create a new Supabase project
   - Run the SQL from `backend/supabase_schema.sql` in the Supabase SQL editor
   - Create a storage bucket named "datasets" for dataset files

7. Run the backend:
```bash
uvicorn main:app --reload --port 8000
```

### Frontend Setup

**Windows (PowerShell):**
```powershell
# Run the setup script
.\setup-frontend.ps1

# Or manually:
cd frontend
npm install
Copy-Item .env.local.example .env.local  # If .env.local doesn't exist
# Edit .env.local with your credentials
npm run dev
```

**Linux/Mac:**
1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```bash
cp .env.local.example .env.local
```

4. Fill in your environment variables:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Run the frontend:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Create a Prompt**: Navigate to Prompts → New Prompt
2. **Upload a Dataset**: Navigate to Datasets → Upload Dataset
3. **Run Evaluation**: Create an evaluation linking a prompt version to a dataset
4. **Improve Prompt**: Use the improvement loop to generate and test candidates
5. **Promote**: Review candidates and promote the best one to active version

## API Endpoints

### Prompts
- `GET /api/prompts` - List all prompts
- `POST /api/prompts` - Create a prompt
- `GET /api/prompts/{id}` - Get a prompt
- `GET /api/prompts/{id}/versions` - List versions
- `POST /api/prompts/{id}/versions` - Create version
- `POST /api/prompts/{id}/versions/{v}/activate` - Activate version

### Datasets
- `GET /api/datasets` - List datasets
- `POST /api/datasets` - Create dataset
- `GET /api/datasets/{id}` - Get dataset

### Evaluations
- `GET /api/evaluations` - List evaluations
- `POST /api/evaluations` - Create evaluation
- `GET /api/evaluations/{id}` - Get evaluation

### Improvements
- `POST /api/improvements/improve` - Run improvement loop
- `POST /api/improvements/promote` - Promote candidate
- `GET /api/improvements/promotions` - List promotions

## Project Structure

```
prompt-optimization/
├── backend/              # FastAPI backend
│   ├── main.py          # FastAPI app
│   ├── routers/         # API routes
│   ├── services/        # Business logic
│   ├── models/          # Pydantic schemas
│   └── db/              # Supabase client
└── frontend/             # Next.js frontend
    ├── app/              # Next.js App Router
    │   ├── layout.tsx    # Root layout
    │   ├── page.tsx      # Dashboard
    │   ├── prompts/      # Prompt pages
    │   ├── datasets/     # Dataset pages
    │   └── evaluations/  # Evaluation pages
    ├── components/       # React components
    ├── lib/              # Utilities
    └── public/           # Static assets
```

## License

MIT
