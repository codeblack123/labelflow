import re
import os

src_file = r'c:\Users\jgilb\OneDrive\Dokumen\bolt new\8_shipping-label-customizer\shipping-label-customizer 9 new 23\shipping-label-customizer 9 new 23\src\components\AdminSkuPriority.tsx'
dst_file = r'c:\Users\jgilb\OneDrive\Dokumen\bolt new\8_shipping-label-customizer\shipping-label-customizer 9 new 23\shipping-label-customizer 9 new 23\src\components\AdminBarangKhusus.tsx'

with open(src_file, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('AdminSkuPriority', 'AdminBarangKhusus')
content = content.replace('priority-bottom', 'barang-khusus')
content = content.replace('import-priority-bottom', 'import-barang-khusus')
content = content.replace('PriorityItem', 'BarangKhususItem')
content = content.replace('SKU Posisi Khusus (BOX/SLOP/PACK)', 'Data Barang Khusus')
content = content.replace('Priority', 'Barang Khusus')
content = content.replace('priorityList', 'barangKhususList')
content = content.replace('setPriorityList', 'setBarangKhususList')
content = content.replace('fetchPriorityList', 'fetchBarangKhususList')

# replace description
content = re.sub(
    r'SKU yang ada di daftar ini akan diletakkan di urutan.*?Custom Label\.',
    'Daftar SKU khusus untuk keperluan validasi.',
    content,
    flags=re.DOTALL
)

with open(dst_file, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
