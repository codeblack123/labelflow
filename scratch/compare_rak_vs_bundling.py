import io
import json
import fitz
from reportlab.pdfgen import canvas
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import main

def render_comparison():
    # Load label table config & bundling 2 config
    label_cfg = {}
    if os.path.exists('label_config.json'):
        with open('label_config.json', 'r', encoding='utf-8') as f:
            label_cfg = json.load(f)
    elif os.path.exists('label_table_config.json'):
        with open('label_table_config.json', 'r', encoding='utf-8') as f:
            label_cfg = json.load(f)

    b2_cfg = {}
    if os.path.exists('label_bundling_2_config.json'):
        with open('label_bundling_2_config.json', 'r', encoding='utf-8') as f:
            b2_cfg = json.load(f)

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

    W_pts = 283.46 # 100mm
    H_pts = 425.20 # 150mm

    # 1. RENDER FORMAT RAK & ID (EXTENDED)
    res_ext = main.generate_table_data(
        chunk=chunk,
        is_extended=True,
        rak_map=rak_map,
        label_cfg=label_cfg,
        picker_name='SADAM',
        W_pts=W_pts
    )
    t_ext = main.create_table(
        res_ext['table_data'],
        row_heights=res_ext['row_heights'],
        span_cmds=res_ext['span_cmds'],
        label_cfg=label_cfg,
        is_bundling=False,
        W_pts=W_pts
    )

    pkt_ext = io.BytesIO()
    can_ext = canvas.Canvas(pkt_ext, pagesize=(W_pts, H_pts))
    t_ext.wrapOn(can_ext, W_pts, H_pts)
    t_ext.drawOn(can_ext, 7.0, H_pts - 40 - sum(res_ext['row_heights']))
    can_ext.save()
    pkt_ext.seek(0)
    doc_ext = fitz.open("pdf", pkt_ext.read())
    pix_ext = doc_ext[0].get_pixmap(dpi=150)
    pix_ext.save("scratch/compare_rak_id.png")

    # 2. RENDER FORMAT BUNDLING PRO
    res_b2 = main.generate_table_data(
        chunk=chunk,
        is_extended=False,
        rak_map=rak_map,
        label_cfg=label_cfg,
        picker_name='SADAM',
        is_bundling_2=True,
        bundling_2_cfg=b2_cfg,
        bundling_map=bundling_map,
        W_pts=W_pts
    )
    t_b2 = main.create_table(
        res_b2['table_data'],
        row_heights=res_b2['row_heights'],
        span_cmds=res_b2['span_cmds'],
        label_cfg=label_cfg,
        is_bundling_2=True,
        bundling_2_cfg=b2_cfg,
        W_pts=W_pts
    )

    pkt_b2 = io.BytesIO()
    can_b2 = canvas.Canvas(pkt_b2, pagesize=(W_pts, H_pts))
    t_b2.wrapOn(can_b2, W_pts, H_pts)
    t_b2.drawOn(can_b2, 7.0, H_pts - 40 - sum(res_b2['row_heights']))
    can_b2.save()
    pkt_b2.seek(0)
    doc_b2 = fitz.open("pdf", pkt_b2.read())
    pix_b2 = doc_b2[0].get_pixmap(dpi=150)
    pix_b2.save("scratch/compare_bundling_pro.png")

    print("Success rendering both! Check scratch/compare_rak_id.png and scratch/compare_bundling_pro.png")
    print("Extended row heights:", res_ext['row_heights'])
    print("Bundling Pro row heights:", res_b2['row_heights'])

if __name__ == '__main__':
    render_comparison()
