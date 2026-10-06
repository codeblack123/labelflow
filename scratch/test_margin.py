import io
import fitz
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle, Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
import numpy as np
from PIL import Image

def test_new_layout(W_pts, raw_widths, filename, picker_name="APRILIA MAULIDA NINGRUM"):
    H_pts = 425.20
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=(W_pts, H_pts))
    
    # Calculate widths
    target_w = round(W_pts - 14.0, 1)
    cur_total = sum(raw_widths)
    scale = target_w / cur_total
    col_widths = [round(w * scale, 1) for w in raw_widths]
    diff = round(target_w - sum(col_widths), 1)
    col_widths[1] = round(col_widths[1] + diff, 1)
    
    col_jenis_w, col_model_w, col_varian_w, col_qty_w = col_widths
    
    # Continuation title
    c.setFont('Helvetica-Bold', 10)
    c.drawString(10, H_pts - 25, 'Lanjutan AWB: CM66501086306 (Hal. 2 dari 2)')
    
    # Header styles
    hdr_txt = colors.black
    total_tbl_w = sum(col_widths)
    
    # PIC header para
    pic_hdr_style = ParagraphStyle(
        'pic_hdr',
        fontSize=10,
        fontName='Helvetica-Bold',
        alignment=1, # Center
        leading=13,
        textColor=hdr_txt
    )
    pic_para = Paragraph(f"<b>PIC : {picker_name}</b>", pic_hdr_style)
    
    # Column headers
    hdr_jenis_style = ParagraphStyle('hdr_j', fontSize=9, fontName='Helvetica-Bold', alignment=1, textColor=hdr_txt)
    hdr_model_style = ParagraphStyle('hdr_m', fontSize=9, fontName='Helvetica-Bold', alignment=1, textColor=hdr_txt)
    hdr_varian_style = ParagraphStyle('hdr_v', fontSize=9, fontName='Helvetica-Bold', alignment=1, textColor=hdr_txt)
    
    table_data = [
        [pic_para, '', '', ''],
        [Paragraph('JENIS', hdr_jenis_style), Paragraph('MODEL', hdr_model_style), Paragraph('VARIAN', hdr_varian_style), 'QTY']
    ]
    row_heights = [20.0, 20.0]
    
    span_cmds = [
        ('SPAN', (0, 0), (3, 0)),
        ('ALIGN', (0, 0), (3, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('FONTNAME', (0, 0), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 1), 9),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),   # JENIS column
        ('ALIGN', (1, 2), (1, -1), 'LEFT'),     # MODEL column data
        ('ALIGN', (2, 1), (2, -1), 'CENTER'),   # VARIAN column
        ('ALIGN', (3, 1), (3, -1), 'CENTER'),   # QTY column
        ('FONTNAME', (3, 2), (3, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (3, 2), (3, -1), 13.5),
    ]
    
    # Data styles
    model_style = ParagraphStyle('data_m', fontSize=8, fontName='Helvetica', alignment=0, leftIndent=4, rightIndent=2)
    model_bold_style = ParagraphStyle('data_mb', fontSize=8, fontName='Helvetica', alignment=0, leftIndent=4, rightIndent=2)
    jenis_style = ParagraphStyle('data_j', fontSize=9, fontName='Helvetica', alignment=1, leading=11)
    
    # Rows
    # Row 1: BINDERNOTE | B5-MHPT-143 | PURPLE | 6
    table_data.append(['BINDERNOTE', Paragraph('B5-MHPT-143', model_style), 'PURPLE', '6'])
    row_heights.append(20.0)
    
    # Row 2: PENCIL COLOR | CP-0133-SH12 | | 12 (merged model+varian)
    r_idx = len(table_data)
    table_data.append([Paragraph('PENCIL<br/>COLOR', jenis_style), Paragraph('CP-0133-SH12', model_style), '', '12'])
    row_heights.append(22.0)
    span_cmds.append(('SPAN', (1, r_idx), (2, r_idx)))
    span_cmds.append(('ALIGN', (1, r_idx), (2, r_idx), 'LEFT'))
    span_cmds.append(('LEFTPADDING', (1, r_idx), (2, r_idx), 4))
    
    # Row 3: BOOK | CLBK-3501/1PC | | 3 (merged)
    r_idx = len(table_data)
    table_data.append(['BOOK', Paragraph('CLBK-3501/1PC', model_style), '', '3'])
    row_heights.append(20.0)
    span_cmds.append(('SPAN', (1, r_idx), (2, r_idx)))
    span_cmds.append(('ALIGN', (1, r_idx), (2, r_idx), 'LEFT'))
    span_cmds.append(('LEFTPADDING', (1, r_idx), (2, r_idx), 4))
    
    # Row 4: MECHANICAL PENCIL | 1BOX/MP-70 | | 22 (merged)
    r_idx = len(table_data)
    table_data.append([Paragraph('MECHANICAL<br/>PENCIL', jenis_style), Paragraph('<b><font size=\"10\">1BOX</font></b>/MP-70', model_style), '', '22'])
    row_heights.append(22.0)
    span_cmds.append(('SPAN', (1, r_idx), (2, r_idx)))
    span_cmds.append(('ALIGN', (1, r_idx), (2, r_idx), 'LEFT'))
    span_cmds.append(('LEFTPADDING', (1, r_idx), (2, r_idx), 4))
    
    # Row 5: PULPEN | 1BOX/GP-157 | BLACK | 2
    r_idx = len(table_data)
    table_data.append(['PULPEN', Paragraph('<b><font size=\"10\">1BOX</font></b>/GP-157', model_style), 'BLACK', '2'])
    row_heights.append(20.0)
    
    t = Table(table_data, colWidths=col_widths, rowHeights=row_heights)
    t.setStyle(TableStyle(span_cmds))
    t.wrapOn(c, W_pts, H_pts)
    table_x = 7.0
    table_y = H_pts - sum(row_heights) - 45
    t.drawOn(c, table_x, table_y)
    
    c.save()
    packet.seek(0)
    doc = fitz.open('pdf', packet.read())
    pix = doc[0].get_pixmap(dpi=150)
    pix.save(filename)
    print(f"Rendered {filename} with new PIC header and Left-aligned MODEL")

if __name__ == '__main__':
    test_new_layout(297.64, [65.0, 113.0, 55.5, 38.0], 'scratch/test_new_layout.png')
