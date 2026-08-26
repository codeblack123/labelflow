import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add to activeMenu type
content = re.sub(
    r"(useState<'upload'.*?'bulkUploadTest') (\| 'bulkUploadTestMsku')",
    r"\1 | 'bulkUploadTes' \2",
    content
)

# 2. Add to URL params check
content = re.sub(
    r"('uploadTest', 'bulkUploadTest')(\].includes\(menuParam\))",
    r"\1, 'bulkUploadTes'\2",
    content
)

# 3. Add to DEFAULT_MENUS
content = re.sub(
    r"('bulkUploadTest', 'bulkUploadPro')",
    r"'bulkUploadTest', 'bulkUploadTes', 'bulkUploadPro'",
    content
)

# 4. Add to condition for timer and auto-click
content = re.sub(
    r"(activeMenu === 'bulkUploadTest')(\|\| activeMenu === 'bulkUploadTestMsku')",
    r"\1 || activeMenu === 'bulkUploadTes' \2",
    content
)

content = re.sub(
    r"(\(activeMenu === 'bulkUploadTest' \|\| activeMenu === 'bulkUploadTestMsku'\))",
    r"(activeMenu === 'bulkUploadTest' || activeMenu === 'bulkUploadTes' || activeMenu === 'bulkUploadTestMsku')",
    content
)

content = re.sub(
    r"('bulkUpload', 'bulkUploadTest', 'bulkUploadTestMsku')",
    r"'bulkUpload', 'bulkUploadTest', 'bulkUploadTes', 'bulkUploadTestMsku'",
    content
)

# 5. Add to MENU_LABELS definition
content = re.sub(
    r"(bulkUploadTest: \{ label: 'Upload Massal 2' \},)",
    r"\1\n    bulkUploadTes: { label: 'Upload Massal Tes' },",
    content
)

# 6. Change titles for rendering
# We want 'Upload Massal Tes' when activeMenu is bulkUploadTes
content = re.sub(
    r"(\{activeMenu === 'bulkUploadTestMsku' \? 'Upload Massal 2 \(\+ Total MSKU\)' : 'Upload Massal 2'\})",
    r"{activeMenu === 'bulkUploadTestMsku' ? 'Upload Massal 2 (+ Total MSKU)' : activeMenu === 'bulkUploadTes' ? 'Upload Massal Tes' : 'Upload Massal 2'}",
    content
)

content = re.sub(
    r"(\{activeMenu === 'bulkUploadTestMsku' \? 'Upload Massal 2 dengan ekstra halaman rekap Total MSKU' : 'Pengolahan label pengiriman secara massal/batch dengan kecepatan pencocokan tinggi'\})",
    r"{activeMenu === 'bulkUploadTestMsku' ? 'Upload Massal 2 dengan ekstra halaman rekap Total MSKU' : activeMenu === 'bulkUploadTes' ? 'Pengolahan label pengiriman secara massal/batch (Versi Tes)' : 'Pengolahan label pengiriman secara massal/batch dengan kecepatan pencocokan tinggi'}",
    content
)


with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done updating App.tsx")
