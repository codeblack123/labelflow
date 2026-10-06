import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + '/..'))

import re
from main import (
    format_bundling_pro_sku,
    generate_table_data_bundling_pro,
    calc_items_for_rows_bundling_pro,
    create_table_bundling_pro
)
from reportlab.lib.pagesizes import portrait
from reportlab.pdfgen import canvas

def run_tests():
    print("=== TEST 1: format_bundling_pro_sku ===")
    bundling_bundle_skus = {
        "MARKER-1BOX/WM-60/BLACK",
        "LEM-1DRUM/GLUE-500",
        "BOOK-1PACK/CLBK-3505",
        "ROKOK-1SLOP/RED",
    }
    
    # 1. Matching SKU with 1BOX
    sku1 = "MARKER-1BOX/WM-60/BLACK"
    res1 = format_bundling_pro_sku(sku1, "Helvetica", 10.5, 142.0, is_in_bundling_db=(sku1.upper() in bundling_bundle_skus))
    print(f"SKU 1 Result:\n{res1}\n")
    assert '<font size="12.5"><b>1BOX</b></font>' in res1, "1BOX should be enlarged to 12.5 and bold"

    # 2. Matching SKU with 1DRUM
    sku2 = "LEM-1DRUM/GLUE-500"
    res2 = format_bundling_pro_sku(sku2, "Helvetica", 10.5, 142.0, is_in_bundling_db=(sku2.upper() in bundling_bundle_skus))
    print(f"SKU 2 Result:\n{res2}\n")
    assert '<font size="12.5"><b>1DRUM</b></font>' in res2, "1DRUM should be enlarged to 12.5 and bold"

    # 3. Matching SKU with 1PACK
    sku3 = "BOOK-1PACK/CLBK-3505"
    res3 = format_bundling_pro_sku(sku3, "Helvetica", 10.5, 142.0, is_in_bundling_db=(sku3.upper() in bundling_bundle_skus))
    print(f"SKU 3 Result:\n{res3}\n")
    assert '<font size="12.5"><b>1PACK</b></font>' in res3, "1PACK should be enlarged to 12.5 and bold"

    # 4. Matching SKU with 1SLOP
    sku4 = "ROKOK-1SLOP/RED"
    res4 = format_bundling_pro_sku(sku4, "Helvetica", 10.5, 142.0, is_in_bundling_db=(sku4.upper() in bundling_bundle_skus))
    print(f"SKU 4 Result:\n{res4}\n")
    assert '<font size="12.5"><b>1SLOP</b></font>' in res4, "1SLOP should be enlarged to 12.5 and bold"

    # 5. Non-matching SKU (e.g. satuan or regular)
    sku5 = "MARKER-WM-60/1PC/BLACK"
    res5 = format_bundling_pro_sku(sku5, "Helvetica", 10.5, 142.0, is_in_bundling_db=(sku5.upper() in bundling_bundle_skus))
    print(f"SKU 5 Result (Non-bundle):\n{res5}\n")
    assert '<font size=' not in res5, "Non-bundle SKU should not have font enlargement"

    print("=== TEST 2: generate_table_data_bundling_pro ===")
    chunk = [
        {"msku": "MARKER-1BOX/WM-60/BLACK", "jumlah": 1},
        {"msku": "BINDERNOTE-B5-MHPT-143/PURPLE", "jumlah": 6},
        {"msku": "LEM-1DRUM/GLUE-500", "jumlah": 2},
    ]
    rak_map = {
        "MARKER-1BOX/WM-60/BLACK": {"rak": "11-EA", "id": "11-EA-04-10"},
        "BINDERNOTE-B5-MHPT-143/PURPLE": {"rak": "3-W", "id": "3-W-03-09"},
        "LEM-1DRUM/GLUE-500": {"rak": "2-B", "id": "2-B-01-05"},
    }
    label_cfg = {
        "ext_font_msku": 10.5,
        "ext_col_rak": 80.0,
        "ext_col_msku": 150.0,
        "ext_col_qty": 50.0,
    }

    tbl_res = generate_table_data_bundling_pro(
        chunk=chunk,
        rak_map=rak_map,
        label_cfg=label_cfg,
        picker_name="SADAM",
        bundling_bundle_skus=bundling_bundle_skus
    )

    table_data = tbl_res['table_data']
    print(f"Total rows in table: {len(table_data)}")
    assert len(table_data) == 4, f"Header + 3 items = 4 rows, got {len(table_data)}"
    
    # Check header
    header_row = table_data[0]
    print("Header row cols:", len(header_row))
    assert len(header_row) == 3, "Header must have exactly 3 columns (Rak & ID, MSKU, Qty)"
    assert header_row[0] == 'Rak & ID'
    assert header_row[2] == 'Qty'

    # Verify no CEK KODE in table data
    for r in table_data:
        for c in r:
            c_str = str(c)
            assert "CEK KODE" not in c_str, "There should be NO 'CEK KODE' anywhere in the table!"

    print("All assertions passed successfully!")

if __name__ == '__main__':
    run_tests()
