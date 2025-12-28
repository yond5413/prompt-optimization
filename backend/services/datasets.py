from typing import List, Dict, Any, Optional
from datasets import load_dataset, get_dataset_config_names, get_dataset_split_names
from huggingface_hub import HfApi
from db.supabase_client import supabase
import json
import csv
import io
import os

class DatasetService:
    @staticmethod
    def _load_starter_datasets() -> Dict[str, Any]:
        """Load starter datasets from JSON file"""
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            json_path = os.path.join(current_dir, "starter_datasets.json")
            with open(json_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading starter datasets: {e}")
            return {}

    @staticmethod
    async def search_hf_datasets(query: str, limit: int = 10) -> List[Dict[str, Any]]:
        api = HfApi()
        datasets = api.list_datasets(search=query, limit=limit)
        return [
            {
                "id": d.id,
                "author": d.author,
                "lastModified": d.lastModified,
                "downloads": d.downloads,
                "tags": d.tags,
            }
            for d in datasets
        ]

    @staticmethod
    async def get_hf_dataset_info(repo_id: str) -> Dict[str, Any]:
        configs = get_dataset_config_names(repo_id)
        splits = get_dataset_split_names(repo_id, configs[0] if configs else None)
        return {
            "configs": configs,
            "splits": splits,
        }

    @staticmethod
    async def import_hf_dataset(
        repo_id: str,
        config_name: Optional[str] = None,
        split: str = "train",
        sample_limit: int = 100
    ) -> str:
        # Load dataset from HF
        ds = load_dataset(repo_id, config_name, split=split, streaming=True)
        
        # Create dataset record in Supabase
        dataset_data = {
            "name": f"{repo_id} ({split})",
            "description": f"Imported from Hugging Face: {repo_id}",
            "source": "huggingface",
            "hf_repo_id": repo_id,
            "config_name": config_name,
            "split": split,
        }
        
        response = supabase.table("datasets").insert(dataset_data).execute()
        if not response.data:
            raise Exception("Failed to create dataset record")
        
        dataset_id = response.data[0]["id"]
        
        # Stream samples and insert into Supabase
        samples = []
        count = 0
        for i, example in enumerate(ds):
            if i >= sample_limit:
                break
            
            # Basic mapping - this might need customization based on dataset
            # For now, we'll store the whole thing in 'input'
            samples.append({
                "dataset_id": dataset_id,
                "input": example,
                "expected_output": example.get("answer") or example.get("output") or example.get("label"),
            })
            count += 1
            
            # Batch insert every 20 samples
            if len(samples) >= 20:
                supabase.table("dataset_samples").insert(samples).execute()
                samples = []
        
        if samples:
            supabase.table("dataset_samples").insert(samples).execute()
            
        return dataset_id

    @staticmethod
    async def get_dataset_samples(dataset_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        response = supabase.table("dataset_samples").select("*").eq("dataset_id", dataset_id).limit(limit).execute()
        return response.data

    @staticmethod
    def get_starter_samples(starter_id: str) -> List[Dict[str, Any]]:
        starters = DatasetService._load_starter_datasets()
        dataset_info = starters.get(starter_id)
        if dataset_info:
            return dataset_info.get("samples", [])
        return []

    @staticmethod
    async def create_starter_dataset(starter_id: str) -> Dict[str, Any]:
        starters = DatasetService._load_starter_datasets()
        info = starters.get(starter_id)
        
        if not info:
            raise ValueError(f"Unknown starter dataset: {starter_id}")
            
        dataset_data = {
            "name": info["name"],
            "description": info["description"],
            "source": "starter",
            "evaluation_strategy": info.get("evaluation_strategy", "exact_match")
        }
        
        response = supabase.table("datasets").insert(dataset_data).execute()
        if not response.data:
            raise Exception("Failed to create dataset record")
            
        dataset_id = response.data[0]["id"]
        samples = DatasetService.get_starter_samples(starter_id)
        
        db_samples = [
            {
                "dataset_id": dataset_id,
                "input": s["input"],
                "expected_output": s["expected_output"]
            }
            for s in samples
        ]
        
        if db_samples:
            supabase.table("dataset_samples").insert(db_samples).execute()
            
        return response.data[0]

    @staticmethod
    async def process_uploaded_file(dataset_id: str, file_content: bytes, filename: str):
        samples = []
        content_str = file_content.decode("utf-8")
        
        if filename.endswith(".csv"):
            reader = csv.DictReader(io.StringIO(content_str))
            for row in reader:
                # heuristic to find input/output columns if not standard
                input_data = row.get("input") or row.get("text") or row.get("prompt")
                output_data = row.get("expected_output") or row.get("output") or row.get("completion") or row.get("label")
                
                # if we can't find clear input/output, store whole row as input
                if not input_data:
                    input_data = row
                    
                samples.append({
                    "dataset_id": dataset_id,
                    "input": {"text": input_data} if isinstance(input_data, str) else input_data,
                    "expected_output": {"text": output_data} if isinstance(output_data, str) else output_data
                })
                
        elif filename.endswith(".jsonl"):
            for line in content_str.splitlines():
                if not line.strip():
                    continue
                data = json.loads(line)
                samples.append({
                    "dataset_id": dataset_id,
                    "input": data.get("input", data),
                    "expected_output": data.get("expected_output") or data.get("output")
                })
        
        if samples:
            # Batch insert
            batch_size = 100
            for i in range(0, len(samples), batch_size):
                batch = samples[i:i+batch_size]
                supabase.table("dataset_samples").insert(batch).execute()
