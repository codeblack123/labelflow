import fitz
import io
import json
from reportlab.pdfgen import canvas

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import main

def test_bundling_pro_pdf():
    chunk = [
        {'msku': 'MARKER-PM-76/1PC/BLACK', 'jumlah': 5},
        {'msku': 'BINDERNOTE-B5-MHPT-143/PURPLE', 'jumlah': 6},
        {'msku': 'PULPEN-1BOX/JK-100NDL/BLUE', 'jumlah': 1},
    ]
    rak_map = {
        'MARKER-PM-76/1PC/BLACK': {'id': '11-EA-04-10'},
        'BINDERNOTE-B5-MHPT-143/PURPLE': {'id': '3-W-03-09'},
        'PULPEN-1BOX/JK-100NDL/BLUE': {'id': '4-AG-03-10'},
    }
    bundling_map = {
        'MARKER-PM-76/1PC/BLACK': True,
        'PULPEN-1BOX/JK-100NDL/BLUE': True,
    }
    
    with open('label_bundling_2_config.json', 'r', encoding='utf-8') as f:
        b2_cfg = json.load(f)

    W_pts = 283.46
    H_pts = 425.20 # 150mm

    res = main.generate_table_data_bundling_pro(
        chunk=chunk,
        rak_map=rak_map,
        label_cfg={},
        picker_name='SADAM',
        bundling_map=bundling_map,
        bundling_2_cfg=b2_cfg,
        W_pts=W_pts
    )

    t = main.create_table_bundling_pro(
        res['table_data'],
        row_heights=res['row_heights'],
        span_cmds=res['span_cmds'],
        label_cfg={},
        bundling_2_cfg=b2_cfg,
        W_pts=W_pts
    )

    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=(W_pts, H_pts))
    t.wrapOn(can, W_pts, H_pts)
    total_h = sum(res['row_heights'])
    table_y = H_pts - 40 - total_h
    t.drawOn(can, 7.0, table_y)
    can.save()

    packet.seek(0)
    doc = fitz.open("pdf", packet.read())
    doc[0].get_pixmap(dpi=150).save("scratch/test_main_bundling_pro.png")
    print("Saved scratch/test_main_bundling_pro.png with total_h:", total_h)

if __name__ == '__main__':
    test_bundling_pro_pdf()
