import re

filepath = r"c:\Users\jgilb\OneDrive\Dokumen\bolt new\8_shipping-label-customizer\shipping-label-customizer 9 new 23\shipping-label-customizer 9 new 23\src\App.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Match the bulkUploadTest block
match = re.search(r'(                \) : activeMenu === \'bulkUploadTest\' \? \(\n(?:.*?)(?=\n                \) : activeMenu === \'bulkUploadPro\'))', content, re.DOTALL)

if match:
    block = match.group(1)
    # Replace bulkExcelFile with bulkTestExcelFile
    new_block = block.replace("bulkExcelFile", "bulkTestExcelFile")
    # Replace bulkPdfPreviewList with bulkTestPdfPreviewList (but actually, let's see if bulkPdfPreviewList is a state or derived variable. If we change it, we might need to add it to state.)
    
    # Wait! In App.tsx, `bulkPdfPreviewList` is a state or variable?
    # Let's replace bulkPdfPreviewList with bulkTestPdfPreviewList and we'll add the state if needed.
    # Actually, Upload Massal 1 doesn't seem to have `setBulkPdfPreviewList` in the clone logic because I didn't see it.
    new_block = new_block.replace("bulkPdfPreviewList", "bulkTestPdfPreviewList")
    
    content = content.replace(block, new_block)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced un-updated variables in bulkUploadTest block.")
else:
    print("Could not find block")
