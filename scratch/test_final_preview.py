import fitz
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas
import html
import io

def generate_table_data_bundling_pro_new(chunk, rak_map, label_cfg=None, picker_name=None, bundling_map=None, bundling_2_cfg=None, W_pts=283.46):
    b_cfg = bundling_2_cfg or {}
    f_rak = float(b_cfg.get('font_rak', 8.5))
    f_sku = float(b_cfg.get('font_sku', 8.5))
    f_qty = float(b_cfg.get('font_qty', 12.0))
    f_hdr = float(b_cfg.get('font_header', 9.0))
    f_badge = float(b_cfg.get('font_badge', 10.5))
    enable_badge = bool(b_cfg.get('enable_badge', True))
    border = float(b_cfg.get('border_thickness', 1.0))

    usable_w = (W_pts - 14.0) if (W_pts and W_pts > 0) else 269.46
    col_rak_w = float(b_cfg.get('col_rak', 75.0))
    col_qty_w = float(b_cfg.get('col_qty', 40.0))
    col_msku_w = usable_w - col_rak_w - col_qty_w

    hdr_style = ParagraphStyle('Hdr', fontSize=f_hdr, fontName='Helvetica-Bold', textColor=colors.black, alignment=1)
    clean_pic = str(picker_name).strip().upper() if picker_name and str(picker_name).strip() else ""
    hdr_msku = Paragraph(f"<b>MSKU &nbsp;|&nbsp; PIC : {html.escape(clean_pic)}</b>" if clean_pic else "<b>MSKU</b>", hdr_style)
    hdr_rak = Paragraph('<b>Rak &amp; ID</b>', hdr_style)
    hdr_qty = Paragraph('<b>Qty</b>', hdr_style)

    table_data = [[hdr_rak, hdr_msku, hdr_qty]]
    row_heights = [18.0]
    span_cmds = []
    custom_styles = []

    b_map = bundling_map or {}
    badges_to_render = []

    for idx, item in enumerate(chunk, start=1):
        sku_raw = item['msku'].strip()
        sku_upper = sku_raw.upper()
        qty_num = int(item.get('jumlah', 1))

        # 1. Rak & ID
        r_info = rak_map.get(sku_upper, {"rak": "", "id": ""})
        loc_str = r_info.get('id', '') or r_info.get('rak', '') or "-"
        p_rak = Paragraph(f'<b><font size="{f_rak}">{html.escape(loc_str)}</font></b>', ParagraphStyle(f'Rak_{idx}', alignment=1))

        # 2. MSKU (Text only, no badge inside cell)
        p_sku = Paragraph(sku_raw, ParagraphStyle(f'Sku_{idx}', fontSize=f_sku, fontName='Helvetica-Bold', leading=max(11, round(f_sku * 1.3))))
        _, h_sku = p_sku.wrap(col_msku_w - 8, 9999)

        # 3. Qty (Clean bold text, NO border box even if qty > 1)
        p_qty = Paragraph(f'<b><font size="{f_qty}">{qty_num}</font></b>', ParagraphStyle(f'Qty_{idx}', alignment=1))

        table_data.append([p_rak, p_sku, p_qty])
        row_heights.append(max(24.0, h_sku + 8.0))

        # Check badge
        is_in_bundling_db = (sku_upper in b_map) if b_map else True # for test
        if enable_badge and is_in_bundling_db:
            if '-' in sku_raw:
                code_part = sku_raw.split('-', 1)[1].strip()
            else:
                code_part = sku_raw
            if code_part:
                badges_to_render.append(f"CEK KODE: {code_part}")

    items_end_row = len(table_data) - 1

    # Base grid on the items table
    custom_styles.append(('GRID', (0,0), (-1, items_end_row), border, colors.black))
    custom_styles.append(('VALIGN', (0,0), (-1, items_end_row), 'MIDDLE'))
    custom_styles.append(('ALIGN', (0,0), (0, items_end_row), 'CENTER'))
    custom_styles.append(('ALIGN', (1,1), (1, items_end_row), 'LEFT'))
    custom_styles.append(('ALIGN', (2,0), (2, items_end_row), 'CENTER'))

    # If badges exist, append them as separate boxed rows underneath
    badge_style = ParagraphStyle('BadgeP', fontSize=f_badge, fontName='Helvetica-Bold', alignment=1, leading=max(12, round(f_badge * 1.25)))
    for b_text in badges_to_render:
        # Spacer row
        spacer_idx = len(table_data)
        table_data.append(['', '', ''])
        row_heights.append(3.0)
        span_cmds.append(('SPAN', (0, spacer_idx), (2, spacer_idx)))

        # Badge row
        b_idx = len(table_data)
        p_b = Paragraph(f'<b>{html.escape(b_text)}</b>', badge_style)
        table_data.append([p_b, '', ''])
        row_heights.append(20.0)
        span_cmds.append(('SPAN', (0, b_idx), (2, b_idx)))
        custom_styles.extend([
            ('BOX', (0, b_idx), (2, b_idx), max(1.0, border), colors.black),
            ('VALIGN', (0, b_idx), (2, b_idx), 'MIDDLE'),
            ('ALIGN', (0, b_idx), (2, b_idx), 'CENTER'),
            ('TOPPADDING', (0, b_idx), (2, b_idx), 2),
            ('BOTTOMPADDING', (0, b_idx), (2, b_idx), 2),
        ])

    return {
        'table_data': table_data,
        'row_heights': row_heights,
        'span_cmds': span_cmds,
        'custom_styles': custom_styles,
        'col_widths': [col_rak_w, col_msku_w, col_qty_w]
    }

def test_render():
    res = generate_table_data_bundling_pro_new(
        chunk=[{'msku': 'MARKER-PM-76/1PC/BLACK', 'jumlah': 5}],
        rak_map={'MARKER-PM-76/1PC/BLACK': {'id': '11-EA-04-10'}},
        picker_name='SADAM',
        bundling_map={'MARKER-PM-76/1PC/BLACK': True}
    )
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=(283.46, 350))
    t = Table(res['table_data'], colWidths=res['col_widths'], rowHeights=res['row_heights'])
    style = [
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]
    style.extend(res['custom_styles'])
    style.extend(res['span_cmds'])
    t.setStyle(TableStyle(style))
    t.wrapOn(can, 283.46, 350)
    t.drawOn(can, 7.0, 150)
    can.save()
    packet.seek(0)
    doc = fitz.open("pdf", packet.read())
    doc[0].get_pixmap(dpi=150).save("scratch/test_final_preview.png")
    print("Saved scratch/test_final_preview.png")

if __name__ == '__main__':
    test_render()
