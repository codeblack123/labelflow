from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
import io

def get_bundling_col_widths(b_cfg=None):
    b_cfg = b_cfg or {}
    raw_widths = [
        float(b_cfg.get('col_jenis', 55)),
        float(b_cfg.get('col_model', 115)),
        float(b_cfg.get('col_varian', 59)),
        float(b_cfg.get('col_qty', 40)),
    ]
    TARGET_TOTAL_WIDTH = 269.0
    cur_total = sum(raw_widths)
    if cur_total > TARGET_TOTAL_WIDTH or cur_total < 250.0:
        scale_ratio = TARGET_TOTAL_WIDTH / cur_total
        col_widths = [round(w * scale_ratio, 1) for w in raw_widths]
        diff = TARGET_TOTAL_WIDTH - sum(col_widths)
        col_widths[1] = round(col_widths[1] + diff, 1)
    else:
        col_widths = raw_widths
    return col_widths

for test_pic in ['ROMY', 'APRILIA MAULIDA NINGRUM', None]:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=(283.46, 400), leftMargin=7, rightMargin=7, topMargin=5, bottomMargin=5)
    col_widths = get_bundling_col_widths()
    col_jenis_w, col_model_w, col_varian_w, col_qty_w = col_widths
    
    hdr_txt = colors.white
    f_jenis, f_model, f_varian, f_qty = 8.0, 8.0, 8.0, 13.5
    row_height = 20.0
    
    jenis_hdr = Paragraph('JENIS', ParagraphStyle('jh', fontName='Helvetica-Bold', fontSize=8.5, alignment=1, textColor=hdr_txt))
    
    if test_pic:
        clean_pic = str(test_pic).strip().upper()
        if len(clean_pic) <= 7:
            model_hdr_html = f"<b>MODEL &nbsp;|&nbsp; PIC : {clean_pic}</b>"
            m_lead = max(12, round(f_model * 1.5))
            m_fs = max(8.0, f_model)
        else:
            if len(clean_pic) > 22: p_fs = 5.5
            elif len(clean_pic) > 16: p_fs = 6.0
            elif len(clean_pic) > 11: p_fs = 6.5
            else: p_fs = 7.0
            model_hdr_html = f"<b>MODEL &nbsp;|</b><br/><font size=\"{p_fs}\"><b>PIC : {clean_pic}</b></font>"
            m_lead = max(9, round(p_fs * 1.35))
            m_fs = max(8.0, f_model)
    else:
        model_hdr_html = "<b>MODEL</b>"
        m_lead = max(12, round(f_model * 1.5))
        m_fs = max(8.5, f_model * 1.1)

    model_hdr = Paragraph(model_hdr_html, ParagraphStyle('mh', fontName='Helvetica-Bold', fontSize=m_fs, alignment=1, leading=m_lead, textColor=hdr_txt))
    varian_hdr = Paragraph('VARIAN', ParagraphStyle('vh', fontName='Helvetica-Bold', fontSize=8.5, alignment=1, textColor=hdr_txt))
    
    table_data = [[jenis_hdr, model_hdr, varian_hdr, 'QTY']]
    
    hdr_w_j, hdr_h_j = jenis_hdr.wrap(col_jenis_w - 8, 9999)
    hdr_w_m, hdr_h_m = model_hdr.wrap(col_model_w - 8, 9999)
    hdr_w_v, hdr_h_v = varian_hdr.wrap(col_varian_w - 8, 9999)
    row_heights = [max(row_height, hdr_h_j + 6, hdr_h_m + 6, hdr_h_v + 6)]
    
    # Bundle item
    table_data.append(['BOOK', '1PACK/CLBK-3501', '-', '1'])
    row_heights.append(20.0)
    
    # Non-bundle item (rata kiri)
    total_span_w = (col_jenis_w + col_model_w + col_varian_w) - 8
    non_bund_style = ParagraphStyle('non_bund', fontName='Helvetica-Bold', fontSize=8.5, alignment=0, leftIndent=4, leading=11)
    table_data.append([Paragraph('PENCILCOLOR-CP-0133-SH12', non_bund_style), '', '', '12'])
    row_heights.append(20.0)
    
    span_cmds = [
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('SPAN', (0, 2), (2, 2)),
        ('ALIGN', (0, 2), (2, 2), 'LEFT'),
        ('LEFTPADDING', (0, 2), (2, 2), 6),
    ]
    
    style = [
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (-1, 0), colors.black),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ] + span_cmds
    
    t = Table(table_data, colWidths=col_widths, rowHeights=row_heights)
    t.setStyle(TableStyle(style))
    doc.build([t])
    print(f"PIC '{test_pic}' -> Header height: {row_heights[0]}, col_widths: {col_widths}, total: {sum(col_widths)}")

print('ALL TESTS COMPLETED SUCCESSFULLY!')
