import re
import os

filepath = r"c:\Users\jgilb\OneDrive\Dokumen\bolt new\8_shipping-label-customizer\shipping-label-customizer 9 new 23\shipping-label-customizer 9 new 23\src\App.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add States
state_src = """    const [bulkExcelFile, setBulkExcelFile] = useState<File | null>(null);
    const [bulkPdfFiles, setBulkPdfFiles] = useState<File[]>([]);
    const [bulkStatus, setBulkStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
    const [bulkProcessedCount, setBulkProcessedCount] = useState(0);
    const [bulkStats, setBulkStats] = useState<ProcessStats | null>(null);"""

state_dst = """    const [bulkTestExcelFile, setBulkTestExcelFile] = useState<File | null>(null);
    const [bulkTestPdfFiles, setBulkTestPdfFiles] = useState<File[]>([]);
    const [bulkTestStatus, setBulkTestStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
    const [bulkTestProcessedCount, setBulkTestProcessedCount] = useState(0);
    const [bulkTestStats, setBulkTestStats] = useState<ProcessStats | null>(null);"""

if state_dst not in content:
    content = content.replace(state_src, state_src + "\n" + state_dst)

# 2. Add activeMenu union
menu_src = " | 'bulkUpload' | 'bulkUploadPro'"
if "'bulkUploadTest'" not in content:
    content = content.replace(menu_src, menu_src + " | 'bulkUploadTest'")

# 3. Add MENU_DEFINITIONS
menu_def_src = "    bulkUpload: { label: 'Upload Massal' },"
menu_def_dst = "    bulkUploadTest: { label: 'Upload Massal 2' },"
if menu_def_dst not in content:
    content = content.replace(menu_def_src, menu_def_src + "\n" + menu_def_dst)

# 4. Extract and duplicate useEffect
effect_match = re.search(r'(    useEffect\(\(\) => \{\n        if \(bulkExcelFile && bulkPdfFiles\.length > 0\) \{.*?setBulkStats\(null\);\n        \}\n    \}, \[bulkExcelFile, bulkPdfFiles\]\);)', content, re.DOTALL)
if effect_match:
    effect_src = effect_match.group(1)
    effect_dst = effect_src.replace("bulkExcelFile", "bulkTestExcelFile")
    effect_dst = effect_dst.replace("bulkPdfFiles", "bulkTestPdfFiles")
    effect_dst = effect_dst.replace("bulkStatus", "bulkTestStatus")
    effect_dst = effect_dst.replace("setBulkStatus", "setBulkTestStatus")
    effect_dst = effect_dst.replace("setBulkProcessedCount", "setBulkTestProcessedCount")
    effect_dst = effect_dst.replace("setBulkStats", "setBulkTestStats")
    effect_dst = effect_dst.replace("setBulkExcelFile", "setBulkTestExcelFile")
    effect_dst = effect_dst.replace("setBulkPdfFiles", "setBulkTestPdfFiles")
    effect_dst = effect_dst.replace("Upload Massal", "Upload Massal 2")
    effect_dst = effect_dst.replace("bulkPdfProcessed", "bulkTestPdfProcessed")
    
    if "bulkTestExcelFile && bulkTestPdfFiles" not in content:
        content = content.replace(effect_src, effect_src + "\n\n" + effect_dst)

# 5. Extract and duplicate handlers (handleBulkExcelSelect, handleBulkPdfSelect, resetBulkUpload)
handler_match = re.search(r'(    const handleBulkExcelSelect = async \(files: FileList \| null\) => \{.*?const resetBulkUpload = async \(\) => \{.*?\n    \};)', content, re.DOTALL)
if handler_match:
    handler_src = handler_match.group(1)
    handler_dst = handler_src.replace("handleBulkExcelSelect", "handleBulkTestExcelSelect")
    handler_dst = handler_dst.replace("handleBulkPdfSelect", "handleBulkTestPdfSelect")
    handler_dst = handler_dst.replace("resetBulkUpload", "resetBulkTestUpload")
    handler_dst = handler_dst.replace("bulkExcelFile", "bulkTestExcelFile")
    handler_dst = handler_dst.replace("setBulkExcelFile", "setBulkTestExcelFile")
    handler_dst = handler_dst.replace("bulkPdfFiles", "bulkTestPdfFiles")
    handler_dst = handler_dst.replace("setBulkPdfFiles", "setBulkTestPdfFiles")
    handler_dst = handler_dst.replace("bulkStatus", "bulkTestStatus")
    handler_dst = handler_dst.replace("setBulkStatus", "setBulkTestStatus")
    handler_dst = handler_dst.replace("setBulkProcessedCount", "setBulkTestProcessedCount")
    handler_dst = handler_dst.replace("setBulkStats", "setBulkTestStats")
    handler_dst = handler_dst.replace("bulkPdfFilesArray", "bulkTestPdfFilesArray")
    handler_dst = handler_dst.replace("bulkPdfPreviewList", "bulkTestPdfPreviewList")
    
    if "const handleBulkTestExcelSelect" not in content:
        content = content.replace(handler_src, handler_src + "\n\n" + handler_dst)

# 6. Extract and duplicate JSX
jsx_match = re.search(r'(                \) : activeMenu === \'bulkUpload\' \? \(\n(?:.*?)(?=\n                \) : activeMenu === \'bulkUploadPro\'))', content, re.DOTALL)
if jsx_match:
    jsx_src = jsx_match.group(1)
    jsx_dst = jsx_src.replace("activeMenu === 'bulkUpload'", "activeMenu === 'bulkUploadTest'")
    jsx_dst = jsx_dst.replace("Upload Massal", "Upload Massal 2")
    jsx_dst = jsx_dst.replace("bulkProcessedCount", "bulkTestProcessedCount")
    jsx_dst = jsx_dst.replace("resetBulkUpload", "resetBulkTestUpload")
    jsx_dst = jsx_dst.replace("handleBulkExcelSelect", "handleBulkTestExcelSelect")
    jsx_dst = jsx_dst.replace("bulkPdfFiles", "bulkTestPdfFiles")
    jsx_dst = jsx_dst.replace("handleBulkPdfSelect", "handleBulkTestPdfSelect")
    jsx_dst = jsx_dst.replace("bulkStatus", "bulkTestStatus")
    jsx_dst = jsx_dst.replace("bulkStats", "bulkTestStats")
    
    # We must also ensure we don't accidentally replace inner Upload Massal if it's meant to be Upload Massal 2
    if "activeMenu === 'bulkUploadTest'" not in content:
        content = content.replace(jsx_src, jsx_src + "\n" + jsx_dst)

# 7. Add to max-w-7xl list
max_w_src = " 'bulkUpload', 'bulkUploadPro'].includes(activeMenu)"
max_w_dst = " 'bulkUpload', 'bulkUploadTest', 'bulkUploadPro'].includes(activeMenu)"
if max_w_dst not in content:
    content = content.replace(max_w_src, max_w_dst)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done cloning bulkUpload to bulkUploadTest in App.tsx")
