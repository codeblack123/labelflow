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


# 4. Extract and duplicate handlers (handleBulkExcelSelect, handleBulkPdfSelect, resetBulkUpload, startBulkProcessing)
handler_match = re.search(r'(    const handleBulkExcelSelect = async \(files: FileList \| null\) => \{.*?const startBulkProcessing = async \(\) => \{.*?\n            \}\n        \}\n    \};)', content, re.DOTALL)
if handler_match:
    handler_src = handler_match.group(1)
    
    # Check where startBulkProcessing ends by looking for the next function declaration
    next_func = re.search(r'\n    const resetFlexUpload', handler_src)
    if next_func:
        handler_src = handler_src[:next_func.start()]

    # We need to make sure we grab startBulkProcessing fully. Actually let's just do it manually with regex that captures up to resetFlexUpload
    
full_handler_match = re.search(r'(    const handleBulkExcelSelect = async \(files: FileList \| null\) => \{.*?)(?=\n    const handleBulkProExcelSelect)', content, re.DOTALL)
if not full_handler_match:
    # try another anchor
    full_handler_match = re.search(r'(    const handleBulkExcelSelect = async \(files: FileList \| null\) => \{.*?)(?=\n    const resetFlexUpload = \(\) => \{)', content, re.DOTALL)

if full_handler_match:
    handler_src = full_handler_match.group(1)
    handler_dst = handler_src.replace("handleBulkExcelSelect", "handleBulkTestExcelSelect")
    handler_dst = handler_dst.replace("handleBulkPdfSelect", "handleBulkTestPdfSelect")
    handler_dst = handler_dst.replace("resetBulkUpload", "resetBulkTestUpload")
    handler_dst = handler_dst.replace("startBulkProcessing", "startBulkTestProcessing")
    handler_dst = handler_dst.replace("bulkExcelFile", "bulkTestExcelFile")
    handler_dst = handler_dst.replace("setBulkExcelFile", "setBulkTestExcelFile")
    handler_dst = handler_dst.replace("bulkPdfFiles", "bulkTestPdfFiles")
    handler_dst = handler_dst.replace("setBulkPdfFiles", "setBulkTestPdfFiles")
    handler_dst = handler_dst.replace("bulkStatus", "bulkTestStatus")
    handler_dst = handler_dst.replace("setBulkStatus", "setBulkTestStatus")
    handler_dst = handler_dst.replace("bulkProcessedCount", "bulkTestProcessedCount")
    handler_dst = handler_dst.replace("setBulkProcessedCount", "setBulkTestProcessedCount")
    handler_dst = handler_dst.replace("bulkStats", "bulkTestStats")
    handler_dst = handler_dst.replace("setBulkStats", "setBulkTestStats")
    
    if "const handleBulkTestExcelSelect" not in content:
        content = content.replace(handler_src, handler_src + "\n" + handler_dst)


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
    jsx_dst = jsx_dst.replace("startBulkProcessing", "startBulkTestProcessing")
    jsx_dst = jsx_dst.replace("bulkStatus", "bulkTestStatus")
    jsx_dst = jsx_dst.replace("bulkStats", "bulkTestStats")
    
    # We must also ensure we don't accidentally replace inner Upload Massal if it's meant to be Upload Massal 2
    if "activeMenu === 'bulkUploadTest'" not in content:
        content = content.replace(jsx_src, jsx_src + "\n" + jsx_dst)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done cloning bulkUpload to bulkUploadTest (including startBulkProcessing) in App.tsx")
