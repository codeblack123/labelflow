import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath('.'))

from main import (
    generate_table_data,
    get_label_config,
    get_label_bundling_2_config,
    format_bundling_pro_sku
)

async def test_parity():
    # 1. Load active configs
    label_cfg = await get_label_config()
    b2_cfg = await get_label_bundling_2_config()
    
    print("Active label_cfg:")
    print("  ext_font_msku:", label_cfg.get('ext_font_msku'))
    print("  ext_font_rak:", label_cfg.get('ext_font_rak'))
    print("  ext_font_qty:", label_cfg.get('ext_font_qty'))
    print("  ext_col_rak:", label_cfg.get('ext_col_rak'))
    print("  ext_col_msku:", label_cfg.get('ext_col_msku'))
    print("  ext_col_qty:", label_cfg.get('ext_col_qty'))
    print("  ext_row_height:", label_cfg.get('ext_row_height'))

    test_items = [
        {"msku": "MARKER-1BOX/WM-60/BLACK", "jumlah": 2},
        {"msku": "REGULAR-SKU/TEST-ITEM", "jumlah": 1}
    ]
    rak_map = {
        "MARKER-1BOX/WM-60/BLACK": {"rak": "11-EA-04-10", "id": "11-EA-04-10"},
        "REGULAR-SKU/TEST-ITEM": {"rak": "3-W-03-09", "id": "3-W-03-09"}
    }
    bundle_skus = {"MARKER-1BOX/WM-60/BLACK"}

    # Format Rak & ID
    res_rak_id = generate_table_data(
        chunk=test_items,
        is_extended=True,
        rak_map=rak_map,
        label_cfg=label_cfg,
        picker_name="TEST_PIC",
        is_bundling=False,
        is_bundling_2=False
    )

    # Format Bundling Pro
    res_bundling_pro = generate_table_data(
        chunk=test_items,
        is_extended=False,
        rak_map=rak_map,
        label_cfg=label_cfg,
        picker_name="TEST_PIC",
        is_bundling=False,
        is_bundling_2=True,
        bundling_2_cfg=b2_cfg,
        bundling_bundle_skus=bundle_skus
    )

    print("\n--- COMPARISON ---")
    print("Format Rak & ID row count:", res_rak_id['total_rows'])
    print("Format Bundling Pro row count:", res_bundling_pro['total_rows'])
    assert res_rak_id['total_rows'] == res_bundling_pro['total_rows'], "Row count mismatch!"

    print("Format Rak & ID col widths:", res_rak_id.get('col_widths', [label_cfg['ext_col_rak'], label_cfg['ext_col_msku'], label_cfg['ext_col_qty']]))
    print("Format Bundling Pro col widths:", res_bundling_pro['col_widths'])

    # Verify span_cmds font sizes
    span_rak_id = dict((cmd[0] + str(cmd[1]), cmd) for cmd in res_rak_id['span_cmds'])
    span_b2 = dict((cmd[0] + str(cmd[1]), cmd) for cmd in res_bundling_pro['span_cmds'])
    
    # Check FONTSIZE for MSKU column
    # In Format Bundling Pro: ('FONTSIZE', (1, 1), (1, items_end_row), ext_f_msku)
    for cmd in res_bundling_pro['span_cmds']:
        if cmd[0] == 'FONTSIZE' and cmd[1][0] == 1:
            print(f"Bundling Pro MSKU column FONTSIZE: {cmd[3]}pt")
            assert cmd[3] == 10.5, f"Expected 10.5pt, got {cmd[3]}pt"

    # Check text formatting for bundle item
    bundle_text = res_bundling_pro['table_data'][1][1].text
    print("\nBundling Pro Item 1 formatted text:", bundle_text)
    assert '<font size="12.5"><b>1BOX</b></font>' in bundle_text, "1BOX not highlighted with 12.5pt!"

    # Check text formatting for non-bundle item
    non_bundle_text = res_bundling_pro['table_data'][2][1].text
    print("Bundling Pro Item 2 formatted text:", non_bundle_text)
    assert '<font size=' not in non_bundle_text, "Non-bundle item should not have font enlargement!"

    print("\nALL PARITY CHECKS PASSED 1000%!")

if __name__ == '__main__':
    asyncio.run(test_parity())
