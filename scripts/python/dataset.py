from datasets import load_dataset

# Downloads and loads the default generalist config
dataset = load_dataset("r0b0tlab/qwen3.8-max-glm5.2-kimi-k3-distillation", "sft_balanced")

# View the training data
print(dataset["train"][0])