import io
import fitz
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics

def test_render(picker_name, filename):
    W_pts, H_pts = 283.46, 425.20
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=(W_pts, H_pts))
    
    col_widths = [50.0, 118.0, 56.0, 38.0]
    col_jenis_w, col_model_w, col_varian_w, col_qty_w = col_widths
    total_span_w = (col_jenis_w + col_model_w + col_varian_w) - 8.0
    usable_model_w = col_model_w - 8.0
    
    f_jenis, f_model, f_varian, f_qty = 8.0, 8.0, 8.0, 13.5
    row_height = 20.0
    hdr_txt = colors.white
    
    # 1. JENIS
    hdr_style_jenis = ParagraphStyle(
        'hdr_j',
        fontSize=max(8.5, f_jenis * 1.1),
        fontName='Helvetica-Bold',
        alignment=1,
        leading=max(12, round(f_jenis * 1.5)),
        textColor=hdr_txt
    )
    jenis_header_para = Paragraph('JENIS', hdr_style_jenis)
    
    # 2. MODEL | PIC : ...
    if picker_name:
        clean_pic = str(picker_name).strip().upper()
        one_line_text = f"MODEL  |  PIC : {clean_pic}"
        w_one = pdfmetrics.stringWidth(one_line_text, 'Helvetica-Bold', f_model)
        if w_one <= usable_model_w:
            model_hdr_html = f"<b>MODEL &nbsp;|&nbsp; PIC : {clean_pic}</b>"
            m_lead = max(12, round(f_model * 1.5))
            m_fs = max(8.0, f_model)
        else:
            pic_text = f"PIC : {clean_pic}"
            p_fs = min(7.5, f_model)
            while p_fs > 4.5 and pdfmetrics.stringWidth(pic_text, 'Helvetica-Bold', p_fs) > (usable_model_w - 4.0):
                p_fs -= 0.25
            nbsp_pic = clean_pic.replace(' ', '&nbsp;')
            model_hdr_html = f"<b>MODEL &nbsp;|</b><br/><font size=\"{p_fs:.1f}\"><b>PIC&nbsp;:&nbsp;{nbsp_pic}</b></font>"
            m_lead = max(8.5, round(p_fs * 1.35))
            m_fs = p_fs
    else:
        model_hdr_html = "<b>MODEL</b>"
        m_lead = max(12, round(f_model * 1.5))
        m_fs = max(8.5, f_model * 1.1)
        
    model_hdr_style = ParagraphStyle(
        'hdr_m',
        fontSize=m_fs,
        fontName='Helvetica-Bold',
        alignment=1,
        leading=m_lead,
        textColor=hdr_txt
    )
    model_header_para = Paragraph(model_hdr_html, model_hdr_style)
    
    # 3. VARIAN
    varian_hdr_style = ParagraphStyle(
        'hdr_v',
        fontSize=max(8.5, f_varian * 1.1),
        fontName='Helvetica-Bold',
        alignment=1,
        leading=max(12, round(f_varian * 1.5)),
        textColor=hdr_txt
    )
    varian_header_para = Paragraph('VARIAN', varian_hdr_style)
    
    table_data = [[jenis_header_para, model_header_para, varian_header_para, 'QTY']]
    
    hdr_w_j, hdr_h_j = jenis_header_para.wrap(col_jenis_w - 8, 9999)
    hdr_w_m, hdr_h_m = model_header_para.wrap(col_model_w - 8, 9999)
    hdr_w_v, hdr_h_v = varian_header_para.wrap(col_varian_w - 8, 9999)
    row_heights = [max(row_height, hdr_h_j + 6, hdr_h_m + 6, hdr_h_v + 6)]
    
    # Item 1: Bundling
    table_data.append(['BOOK', '1PACK/CLBK-3501', '-', '1'])
    row_heights.append(20.0)
    
    # Item 2: Non-bundling (Rata Kiri)
    non_bund_style = ParagraphStyle(
        'non_bund',
        fontSize=f_model,
        leading=max(12, round(f_model * 1.5)),
        fontName='Helvetica-Bold',
        alignment=0,
        leftIndent=4,
        rightIndent=2
    )
    sku_para = Paragraph('PENCILCOLOR-CP-0133-SH12', non_bund_style)
    table_data.append([sku_para, '', '', '12'])
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
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica'),
        ('FONTNAME', (1, 1), (1, -1), 'Helvetica'),
        ('FONTNAME', (2, 1), (2, -1), 'Helvetica'),
        ('FONTNAME', (3, 1), (3, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (0, -1), 8),
        ('FONTSIZE', (1, 1), (1, -1), 8),
        ('FONTSIZE', (2, 1), (2, -1), 8),
        ('FONTSIZE', (3, 1), (3, -1), 13.5),
    ] + span_cmds
    
    t = Table(table_data, colWidths=col_widths, rowHeights=row_heights)
    t.setStyle(TableStyle(style))
    t.wrapOn(c, W_pts, H_pts)
    
    table_x = 8.0
    table_y = H_pts - 100 - sum(row_heights)
    t.drawOn(c, table_x, table_y)
    
    c.save()
    packet.seek(0)
    doc = fitz.open('pdf', packet.read())
    pix = doc[0].get_pixmap(dpi=150)
    pix.save(filename)
    print(f'Saved {filename}: size={pix.width}x{pix.height}, header_h={row_heights[0]}')

test_render('ROMY', 'test_romy.png')
test_render('APRILIA MAULIDA NINGRUM', 'test_aprilia.png')
