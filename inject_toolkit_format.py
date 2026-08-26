import re

with open('main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Extract the formatting block from generate_packing_list
# From "# Fetch Formatting Rules" (around 3512) to "output.seek(0)" and QR cleanup (around 3859)
start_extract = -1
end_extract = -1
for i, line in enumerate(lines):
    if '# Fetch Formatting Rules' in line and start_extract == -1:
        # Check if we are inside generate_packing_list
        start_extract = i
    if start_extract != -1 and '# Use pdf_name if provided, otherwise fallback to excel name' in line:
        end_extract = i
        break

if start_extract == -1 or end_extract == -1:
    print("Could not find extraction bounds.")
    exit(1)

extracted_lines = lines[start_extract:end_extract]

# We need to adapt variables for toolkit
# output_df -> final_df
# pdf_name -> pdf_files[0].filename if pdf_files else "Toolkit_Label"
# excel -> excel_file.filename

extracted_text = "".join(extracted_lines)
extracted_text = extracted_text.replace("output_df", "final_df")
extracted_text = extracted_text.replace("pdf_name if pdf_name else excel", "pdf_files[0].filename if pdf_files else excel_file.filename")
extracted_text = extracted_text.replace("excel", "excel_file.filename")

# 2. Find where to replace in toolkit_generate_packing_list
# We want to replace from "        output = io.BytesIO()" all the way to "output.seek(0)"
# Since toolkit_generate_packing_list is at the end of the file
toolkit_start_idx = -1
for i in range(len(lines)-1, -1, -1):
    if "def toolkit_generate_packing_list" in lines[i]:
        toolkit_start_idx = i
        break

start_replace = -1
end_replace = -1
for i in range(toolkit_start_idx, len(lines)):
    if "        output = io.BytesIO()" in lines[i] and start_replace == -1:
        start_replace = i
    if "        output.seek(0)" in lines[i] and start_replace != -1:
        end_replace = i
        break

if start_replace == -1 or end_replace == -1:
    print("Could not find replacement bounds in toolkit_generate_packing_list.")
    exit(1)

# Keep the indentation (8 spaces)
adapted_block = "        output = io.BytesIO()\n" + extracted_text

new_lines = lines[:start_replace] + [adapted_block] + lines[end_replace+1:]

with open('main.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Successfully injected exact styling logic to toolkit_generate_packing_list! Lines {start_replace}-{end_replace} replaced.")
