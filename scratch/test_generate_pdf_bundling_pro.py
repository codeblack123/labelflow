import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + '/..'))

from main import (
    generate_table_data_bundling_pro,
    create_table_bundling_pro
)
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import portrait

def generate_sample_pdf():
    pdf_path = os.path.abspath(os.path.dirname(__file__) + "/sample_bundling_pro.pdf")
    
    W_pts = 283.46 # 100mm
    H_pts = 425.20 # 150mm

    c = canvas.Canvas(pdf_path, pagesize=(W_pts, H_pts))
    
    bundling_bundle_skus = {
        "MARKER-1BOX/WM-60/BLACK",
        "LEM-1DRUM/GLUE-500",
        "BOOK-1PACK/CLBK-3505",
        "ROKOK-1SLOP/RED",
    }
    
    chunk = [
        {"msku": "MARKER-1BOX/WM-60/BLACK", "jumlah": 1},
        {"msku": "BINDERNOTE-B5-MHPT-143/PURPLE", "jumlah": 6},
        {"msku": "LEM-1DRUM/GLUE-500", "jumlah": 2},
        {"msku": "BOOK-1PACK/CLBK-3505", "jumlah": 10},
    ]
    
    rak_map = {
        "MARKER-1BOX/WM-60/BLACK": {"rak": "11-EA", "id": "11-EA-04-10"},
        "BINDERNOTE-B5-MHPT-143/PURPLE": {"rak": "3-W", "id": "3-W-03-09"},
        "LEM-1DRUM/GLUE-500": {"rak": "2-B", "id": "2-B-01-05"},
        "BOOK-1PACK/CLBK-3505": {"rak": "4-AG", "id": "4-AG-03-10"},
    }
    
    label_cfg = {
        "ext_col_rak": 80.0,
        "ext_col_msku": 150.0,
        "ext_col_qty": 50.0,
        "ext_font_rak": 10.5,
        "ext_font_msku": 10.5,
        "ext_font_qty": 13.5,
        "ext_row_height": 25.0,
        "border_thickness": 0.5,
        "header_bg": "#ffffff",
        "header_color": "#000000"
    }

    tbl_res = generate_table_data_bundling_pro(
        chunk=chunk,
        rak_map=rak_map,
        label_cfg=label_cfg,
        picker_name="SADAM",
        bundling_bundle_skus=bundling_bundle_skus
    )

    t = create_table_bundling_pro(
        tbl_res['table_data'],
        row_heights=tbl_res['row_heights'],
        span_cmds=tbl_res['span_cmds'],
        label_cfg=label_cfg,
        W_pts=W_pts
    )

    t.wrapOn(c, W_pts, H_pts)
    total_h = sum(tbl_res['row_heights'])
    table_y = H_pts - 40 - total_h
    t.drawOn(c, 7.0, table_y)
    
    c.save()
    print("PDF generated successfully at:", pdf_path)
    print("File size:", os.path.getsize(pdf_path), "bytes")

if __name__ == '__main__':
    generate_sample_pdf()
