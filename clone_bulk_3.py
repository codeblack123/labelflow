import re
import os

filepath = r"c:\Users\jgilb\OneDrive\Dokumen\bolt new\8_shipping-label-customizer\shipping-label-customizer 9 new 23\shipping-label-customizer 9 new 23\src\App.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Duplicate startBulkProcessing to startBulkTestProcessing
match = re.search(r'(    const startBulkProcessing = async \(\) => \{.*?)(?=\n    const resetFlexUpload = \(\) => \{)', content, re.DOTALL)
if match:
    src = match.group(1)
    dst = src.replace("startBulkProcessing", "startBulkTestProcessing")
    dst = dst.replace("bulkExcelFile", "bulkTestExcelFile")
    dst = dst.replace("setBulkExcelFile", "setBulkTestExcelFile")
    dst = dst.replace("bulkPdfFiles", "bulkTestPdfFiles")
    dst = dst.replace("setBulkPdfFiles", "setBulkTestPdfFiles")
    dst = dst.replace("bulkStatus", "bulkTestStatus")
    dst = dst.replace("setBulkStatus", "setBulkTestStatus")
    dst = dst.replace("bulkProcessedCount", "bulkTestProcessedCount")
    dst = dst.replace("setBulkProcessedCount", "setBulkTestProcessedCount")
    dst = dst.replace("bulkStats", "bulkTestStats")
    dst = dst.replace("setBulkStats", "setBulkTestStats")
    dst = dst.replace("Upload Massal", "Upload Massal 2")
    
    if "const startBulkTestProcessing" not in content:
        content = content.replace(src, src + "\n" + dst)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Cloned startBulkProcessing")
    else:
        print("startBulkTestProcessing already exists")
        
    # Wait, also we need to update JSX: replace startBulkProcessing with startBulkTestProcessing inside the bulkUploadTest block
    jsx_match = re.search(r'(                \) : activeMenu === \'bulkUploadTest\' \? \(\n(?:.*?)(?=\n                \) : activeMenu === \'bulkUploadPro\'))', content, re.DOTALL)
    if jsx_match:
        jsx_src = jsx_match.group(1)
        jsx_dst = jsx_src.replace("startBulkProcessing", "startBulkTestProcessing")
        
        if "startBulkTestProcessing" not in jsx_src:
            content = content.replace(jsx_src, jsx_dst)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print("Replaced startBulkTestProcessing in JSX")
else:
    print("Could not find startBulkProcessing")
