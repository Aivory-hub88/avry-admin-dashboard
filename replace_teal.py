import os
import re

directory = '/Users/ireichmann/Documents/Aivory V2/frontend/avry-admin-dashboard'
pattern_hex = re.compile(re.escape('#00e59e'), re.IGNORECASE)
pattern_rgba = re.compile(re.escape('rgba(0, 229, 158'), re.IGNORECASE)
pattern_rgba_no_space = re.compile(re.escape('rgba(0,229,158'), re.IGNORECASE)

count_files = 0
count_replacements = 0

for root, _, files in os.walk(directory):
    if 'node_modules' in root or '.next' in root or '.git' in root:
        continue
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css')):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content, num_subs1 = pattern_hex.subn('#b7cba6', content)
            new_content, num_subs2 = pattern_rgba.subn('rgba(183, 203, 166', new_content)
            new_content, num_subs3 = pattern_rgba_no_space.subn('rgba(183,203,166', new_content)
            
            total_subs = num_subs1 + num_subs2 + num_subs3
            if total_subs > 0:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                count_files += 1
                count_replacements += total_subs

print(f"Replaced {count_replacements} occurrences in {count_files} files.")
