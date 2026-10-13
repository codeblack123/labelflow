import asyncio
import json
import os
import sys

# Ensure current dir is in path
sys.path.insert(0, os.path.abspath('.'))

from main import supabase_fetch, LABEL_CONFIG_FILE, LABEL_BUNDLING_2_CONFIG_FILE

async def run_sync():
    unified_cfg = {
        "std_col_msku": 220.0,
        "std_col_qty": 50.0,
        "std_font_msku": 11.0,
        "std_font_qty": 13.5,
        "std_font_size": 8.0,
        "std_row_height": 18.0,
        "ext_col_rak": 80.0,
        "ext_col_msku": 150.0,
        "ext_col_qty": 50.0,
        "ext_font_rak": 10.5,
        "ext_font_msku": 10.5,
        "ext_font_qty": 13.5,
        "ext_font_size": 8.0,
        "ext_row_height": 25.0,
        "border_thickness": 0.5,
        "header_bg": "#ffffff",
        "header_color": "#000000",
        "std_font_msku_family": "Helvetica",
        "std_font_qty_family": "Bahnschrift",
        "ext_font_rak_family": "Bahnschrift",
        "ext_font_msku_family": "Helvetica",
        "ext_font_qty_family": "Bahnschrift",
        "std_font_msku_bold": True,
        "std_font_qty_bold": True,
        "ext_font_rak_bold": True,
        "ext_font_msku_bold": True,
        "ext_font_qty_bold": True
    }

    # 1. Write local label_config.json
    with open(LABEL_CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(unified_cfg, f, indent=2)
    print("1. Local label_config.json updated successfully.")

    # 2. Patch Supabase label_table_config
    try:
        res1 = await supabase_fetch("PATCH", "app_settings?key=eq.label_table_config", data={"value": json.dumps(unified_cfg)})
        print("2. Supabase label_table_config updated:", res1)
    except Exception as e:
        print("2. Supabase label_table_config error:", e)

    # 3. Bundling Pro config (identical dimensions & fonts)
    b2_cfg = {
        "col_rak": 80.0,
        "col_sku": 150.0,
        "col_qty": 50.0,
        "font_rak": 10.5,
        "font_sku": 10.5,
        "font_qty": 13.5,
        "font_header": 10.0,
        "font_badge": 10.5,
        "border_thickness": 0.5,
        "enable_badge": False,
        "header_bg": "#ffffff",
        "header_color": "#000000",
        "ext_col_rak": 80.0,
        "ext_col_msku": 150.0,
        "ext_col_qty": 50.0,
        "ext_font_rak": 10.5,
        "ext_font_msku": 10.5,
        "ext_font_qty": 13.5,
        "ext_row_height": 25.0
    }

    # 4. Write local label_bundling_2_config.json
    with open(LABEL_BUNDLING_2_CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(b2_cfg, f, indent=2)
    print("3. Local label_bundling_2_config.json updated successfully.")

    # 5. Patch Supabase label_bundling_2_config
    try:
        res2 = await supabase_fetch("PATCH", "app_settings?key=eq.label_bundling_2_config", data={"value": json.dumps(b2_cfg)})
        print("4. Supabase label_bundling_2_config updated:", res2)
    except Exception as e:
        print("4. Supabase label_bundling_2_config error:", e)

if __name__ == '__main__':
    asyncio.run(run_sync())
