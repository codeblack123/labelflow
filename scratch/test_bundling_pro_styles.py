import fitz
from reportlab.platypus import Paragraph, Table, TableStyle, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas
import html
import io

W_pts = 283.46
H_pts = 425.20 # standard 100x150mm approx
usable_w = W_pts - 14.0 # 269.46
col_rak_w = 75.0
col_qty_w = 40.0
col_msku_w = usable_w - col_rak_w - col_qty_w

styles = getSampleStyleSheet()

# Option A: Attached spanned row (shares table border)
def render_option_a():
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=(W_pts, 300))
    
    hdr_style = ParagraphStyle('HdrA', fontSize=9, fontName='Helvetica-Bold', textColor=colors.black, alignment=1)
    sku_style = ParagraphStyle('SkuA', fontSize=8.5, fontName='Helvetica-Bold', leading=11)
    rak_style = ParagraphStyle('RakA', fontSize=8.5, fontName='Helvetica-Bold', alignment=1)
    qty_style = ParagraphStyle('QtyA', fontSize=12, fontName='Helvetica-Bold', alignment=1)
    badge_style = ParagraphStyle('BadgeA', fontSize=10, fontName='Helvetica-Bold', alignment=1, leading=12)
    
    table_data = [
        [Paragraph('<b>Rak & ID</b>', hdr_style), Paragraph('<b>MSKU | PIC : SADAM</b>', hdr_style), Paragraph('<b>Qty</b>', hdr_style)],
        [Paragraph('<b>11-EA-04-10</b>', rak_style), Paragraph('<b>MARKER-PM-76/1PC/BLACK</b>', sku_style), Paragraph('<b>5</b>', qty_style)],
        [Paragraph('<b>CEK KODE: PM-76/1PC/BLACK</b>', badge_style), '', '']
    ]
    
    row_heights = [18, 28, 20]
    t = Table(table_data, colWidths=[col_rak_w, col_msku_w, col_qty_w], rowHeights=row_heights)
    t.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 1.0, colors.black),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('SPAN', (0,2), (2,2)),
        ('ALIGN', (0,2), (2,2), 'CENTER'),
        ('TOPPADDING', (0,2), (2,2), 2),
        ('BOTTOMPADDING', (0,2), (2,2), 2),
    ]))
    
    t.wrapOn(can, W_pts, 300)
    t.drawOn(can, 7.0, 150)
    can.save()
    
    packet.seek(0)
    doc = fitz.open("pdf", packet.read())
    pix = doc[0].get_pixmap(dpi=150)
    pix.save("scratch/option_a_attached.png")

# Option B: Separate table / box with small gap (like in user image 2)
def render_option_b():
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=(W_pts, 300))
    
    hdr_style = ParagraphStyle('HdrB', fontSize=9, fontName='Helvetica-Bold', textColor=colors.black, alignment=1)
    sku_style = ParagraphStyle('SkuB', fontSize=8.5, fontName='Helvetica-Bold', leading=11)
    rak_style = ParagraphStyle('RakB', fontSize=8.5, fontName='Helvetica-Bold', alignment=1)
    qty_style = ParagraphStyle('QtyB', fontSize=12, fontName='Helvetica-Bold', alignment=1)
    badge_style = ParagraphStyle('BadgeB', fontSize=10, fontName='Helvetica-Bold', alignment=1, leading=12)
    
    # Main table
    table_data = [
        [Paragraph('<b>Rak & ID</b>', hdr_style), Paragraph('<b>MSKU | PIC : SADAM</b>', hdr_style), Paragraph('<b>Qty</b>', hdr_style)],
        [Paragraph('<b>11-EA-04-10</b>', rak_style), Paragraph('<b>MARKER-PM-76/1PC/BLACK</b>', sku_style), Paragraph('<b>5</b>', qty_style)],
    ]
    t_main = Table(table_data, colWidths=[col_rak_w, col_msku_w, col_qty_w], rowHeights=[18, 28])
    t_main.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 1.0, colors.black),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    
    # Badge table
    t_badge = Table([[Paragraph('<b>CEK KODE: PM-76/1PC/BLACK</b>', badge_style)]], colWidths=[usable_w], rowHeights=[20])
    t_badge.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1.2, colors.black),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    
    t_main.wrapOn(can, W_pts, 300)
    t_badge.wrapOn(can, W_pts, 300)
    
    t_main.drawOn(can, 7.0, 180)
    t_badge.drawOn(can, 7.0, 156) # 4pt gap
    can.save()
    
    packet.seek(0)
    doc = fitz.open("pdf", packet.read())
    pix = doc[0].get_pixmap(dpi=150)
    pix.save("scratch/option_b_separated.png")

# Option C: Combined in single table using spacer row without borders
def render_option_c():
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=(W_pts, 300))
    
    hdr_style = ParagraphStyle('HdrC', fontSize=9, fontName='Helvetica-Bold', textColor=colors.black, alignment=1)
    sku_style = ParagraphStyle('SkuC', fontSize=8.5, fontName='Helvetica-Bold', leading=11)
    rak_style = ParagraphStyle('RakC', fontSize=8.5, fontName='Helvetica-Bold', alignment=1)
    qty_style = ParagraphStyle('QtyC', fontSize=12, fontName='Helvetica-Bold', alignment=1)
    badge_style = ParagraphStyle('BadgeC', fontSize=10, fontName='Helvetica-Bold', alignment=1, leading=12)
    
    table_data = [
        [Paragraph('<b>Rak & ID</b>', hdr_style), Paragraph('<b>MSKU | PIC : SADAM</b>', hdr_style), Paragraph('<b>Qty</b>', hdr_style)],
        [Paragraph('<b>11-EA-04-10</b>', rak_style), Paragraph('<b>MARKER-PM-76/1PC/BLACK</b>', sku_style), Paragraph('<b>5</b>', qty_style)],
        ['', '', ''], # spacer
        [Paragraph('<b>CEK KODE: PM-76/1PC/BLACK</b>', badge_style), '', '']
    ]
    
    row_heights = [18, 28, 4, 20]
    t = Table(table_data, colWidths=[col_rak_w, col_msku_w, col_qty_w], rowHeights=row_heights)
    t.setStyle(TableStyle([
        ('GRID', (0,0), (2,1), 1.0, colors.black),
        ('VALIGN', (0,0), (2,1), 'MIDDLE'),
        ('SPAN', (0,2), (2,2)), # spacer row
        ('SPAN', (0,3), (2,3)), # badge row
        ('BOX', (0,3), (2,3), 1.2, colors.black),
        ('VALIGN', (0,3), (2,3), 'MIDDLE'),
        ('ALIGN', (0,3), (2,3), 'CENTER'),
        ('TOPPADDING', (0,3), (2,3), 2),
        ('BOTTOMPADDING', (0,3), (2,3), 2),
    ]))
    
    t.wrapOn(can, W_pts, 300)
    t.drawOn(can, 7.0, 150)
    can.save()
    
    packet.seek(0)
    doc = fitz.open("pdf", packet.read())
    pix = doc[0].get_pixmap(dpi=150)
    pix.save("scratch/option_c_single_table_gap.png")

if __name__ == '__main__':
    render_option_a()
    render_option_b()
    render_option_c()
    print("Done rendering test options!")
