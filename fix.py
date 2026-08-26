import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

blocks = [
    ('const startProcessing = async () => {', 'excelFile', 'activeExcel', 'const startProcessing2 = async () => {'),
    ('const startProcessing2 = async () => {', 'excelFile2', 'activeExcel2', 'const handleBulkProExcelSelect ='),
    ('const startBulkProProcessing = async () => {', 'bulkProExcelFile', 'activeBulkProExcel', 'const handleBulkExcelSelect ='),
    ('const startBulkProcessing = async () => {', 'bulkExcelFile', 'activeBulkExcel', 'const handleFlexExcelSelect ='),
    ('const startBulkTestProcessing = async () => {', 'bulkTestExcelFile', 'activeBulkTestExcel', 'const handleTestExcelSelect ='),
    ('const startTestProcessing = async () => {', 'testExcelFile', 'activeTestExcel', 'const resetFlexUpload ='),
    ('const startFlexProcessing = async () => {', 'flexExcelFile', 'activeFlexExcel', 'return (')
]

for start_str, old_var, new_var, next_str in blocks:
    start_idx = code.find(start_str)
    if start_idx == -1: continue
    
    end_idx = code.find(next_str, start_idx)
    if end_idx == -1: end_idx = len(code)
    
    block = code[start_idx:end_idx]
    
    # 1. Replace the intercept
    pattern = r"// --- INTERCEPT: SABOTAGE \(ACCURACY TEST\) SYSTEM ---\s+await executeSabotage\((.*?),\s*(.*?),\s*" + old_var + r"\);\s+// --- END SABOTAGE SYSTEM ---"
    match = re.search(pattern, block)
    if not match:
        print("Skipping", start_str)
        continue
        
    pdf_var = match.group(1)
    set_func = match.group(2)
    
    new_intercept = f"""// --- INTERCEPT: SABOTAGE (ACCURACY TEST) SYSTEM ---
        let {new_var} = {old_var};
        const sabotaged_{new_var} = await executeSabotage({pdf_var}, {set_func}, {old_var});
        if (sabotaged_{new_var}) {new_var} = sabotaged_{new_var};
        // --- END SABOTAGE SYSTEM ---"""
        
    # Replace just the first occurrence
    block = block[:match.start()] + new_intercept + block[match.end():]
    
    # 2. Replace variables in the rest of the block
    intercept_end_idx = block.find('// --- END SABOTAGE SYSTEM ---') + len('// --- END SABOTAGE SYSTEM ---')
    block_before = block[:intercept_end_idx]
    block_after = block[intercept_end_idx:]
    
    block_after = re.sub(r'\b' + old_var + r'\b', new_var, block_after)
    
    code = code[:start_idx] + block_before + block_after + code[end_idx:]

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("App.tsx updated!")
