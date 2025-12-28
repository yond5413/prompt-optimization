from typing import List, Dict, Any, Optional
from datasets import load_dataset, get_dataset_config_names, get_dataset_split_names
from huggingface_hub import HfApi
from db.supabase_client import supabase
import json

class DatasetService:
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


