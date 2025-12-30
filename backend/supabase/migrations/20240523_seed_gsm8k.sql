-- Seed GSM8K dataset and samples
DO $$
DECLARE
    ds_id UUID;
BEGIN
    -- Insert dataset if it doesn't exist
    INSERT INTO datasets (name, description, source, hf_repo_id, split, evaluation_strategy)
    VALUES (
        'GSM8K (Seed)', 
        'Grade School Math 8K (Seeded Subset)', 
        'huggingface', 
        'openai/gsm8k', 
        'train', 
        'exact_match'
    )
    RETURNING id INTO ds_id;

    -- Insert samples
    INSERT INTO dataset_samples (dataset_id, input, expected_output, metadata)
    VALUES 
    (
        ds_id,
        '{"question": "Natalia sold clips to 48 of her friends in April, and then she sold half as many clips in May. How many clips did Natalia sell altogether in April and May?"}'::jsonb,
        '{"answer": "Natalia sold 48/2 = <<48/2=24>>24 clips in May. Natalia sold 48+24 = <<48+24=72>>72 clips altogether in April and May. #### 72"}'::jsonb,
        '{"source": "seed", "original_split": "train"}'::jsonb
    ),
    (
        ds_id,
        '{"question": "Weng earns $12 an hour for babysitting. Yesterday, she just did 50 minutes of babysitting. How much did she earn?"}'::jsonb,
        '{"answer": "Weng earns 12/60 = $<<12/60=0.2>>0.2 per minute. Working 50 minutes, she earned 0.2 x 50 = $<<0.2*50=10>>10. #### 10"}'::jsonb,
        '{"source": "seed", "original_split": "train"}'::jsonb
    ),
    (
        ds_id,
        '{"question": "Betty is saving money for a new wallet which costs $100. Betty has only half of the money she needs. Her parents decided to give her $15 for that purpose, and her grandparents twice as much as her parents. How much more money does Betty need to buy the wallet?"}'::jsonb,
        '{"answer": "In the beginning, Betty has only 100 / 2 = $<<100/2=50>>50. Betty''s grandparents gave her 15 * 2 = $<<15*2=30>>30. This means, Betty needs 100 - 50 - 30 - 15 = $<<100-50-30-15=5>>5 more. #### 5"}'::jsonb,
        '{"source": "seed", "original_split": "train"}'::jsonb
    );
END $$;

