import fitz
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas
import io

W_pts = 283.46
usable_w = W_pts - 14.0
col_rak_w = 75.0
col_qty_w = 40.0
col_msku_w = usable_w - col_rak_w - col_qty_w

hdr_style = ParagraphStyle('Hdr', fontSize=9, fontName='Helvetica-Bold', textColor=colors.black, alignment=1)
sku_style = ParagraphStyle('Sku', fontSize=8.5, fontName='Helvetica-Bold', leading=11)
rak_style = ParagraphStyle('Rak', fontSize=8.5, fontName='Helvetica-Bold', alignment=1)
qty_style = ParagraphStyle('Qty', fontSize=12, fontName='Helvetica-Bold', alignment=1)
badge_style = ParagraphStyle('Badge', fontSize=10, fontName='Helvetica-Bold', alignment=1, leading=12)

def test_multi_under_each_item():
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=(W_pts, 350))
    
    table_data = [
        [Paragraph('<b>Rak & ID</b>', hdr_style), Paragraph('<b>MSKU | PIC : SADAM</b>', hdr_style), Paragraph('<b>Qty</b>', hdr_style)],
        # Item 1
        [Paragraph('<b>11-EA-04-10</b>', rak_style), Paragraph('<b>MARKER-PM-76/1PC/BLACK</b>', sku_style), Paragraph('<b>5</b>', qty_style)],
        ['', '', ''], # gap 1
        [Paragraph('<b>CEK KODE: PM-76/1PC/BLACK</b>', badge_style), '', ''],
        # Item 2
        [Paragraph('<b>13-FF-02-05</b>', rak_style), Paragraph('<b>PENCILCOLOR-CP-0133-SH12</b>', sku_style), Paragraph('<b>12</b>', qty_style)],
    ]
    
    row_heights = [18, 26, 3, 19, 26]
    t = Table(table_data, colWidths=[col_rak_w, col_msku_w, col_qty_w], rowHeights=row_heights)
    t.setStyle(TableStyle([
        # Item 1 grid
        ('GRID', (0,0), (2,1), 1.0, colors.black),
        ('VALIGN', (0,0), (2,1), 'MIDDLE'),
        # Gap
        ('SPAN', (0,2), (2,2)),
        # Badge 1
        ('SPAN', (0,3), (2,3)),
        ('BOX', (0,3), (2,3), 1.0, colors.black),
        ('VALIGN', (0,3), (2,3), 'MIDDLE'),
        ('ALIGN', (0,3), (2,3), 'CENTER'),
        # Item 2 grid
        ('GRID', (0,4), (2,4), 1.0, colors.black),
        ('VALIGN', (0,4), (2,4), 'MIDDLE'),
    ]))
    
    t.wrapOn(can, W_pts, 350)
    t.drawOn(can, 7.0, 100)
    can.save()
    packet.seek(0)
    doc = fitz.open("pdf", packet.read())
    pix = doc[0].get_pixmap(dpi=150)
    pix.save("scratch/test_multi_each.png")

def test_multi_under_table():
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=(W_pts, 350))
    
    table_data = [
        [Paragraph('<b>Rak & ID</b>', hdr_style), Paragraph('<b>MSKU | PIC : SADAM</b>', hdr_style), Paragraph('<b>Qty</b>', hdr_style)],
        # Item 1
        [Paragraph('<b>11-EA-04-10</b>', rak_style), Paragraph('<b>MARKER-PM-76/1PC/BLACK</b>', sku_style), Paragraph('<b>5</b>', qty_style)],
        # Item 2
        [Paragraph('<b>13-FF-02-05</b>', rak_style), Paragraph('<b>PENCILCOLOR-CP-0133-SH12</b>', sku_style), Paragraph('<b>12</b>', qty_style)],
        ['', '', ''], # gap
        # Badges
        [Paragraph('<b>CEK KODE: PM-76/1PC/BLACK</b>', badge_style), '', ''],
    ]
    
    row_heights = [18, 26, 26, 3, 19]
    t = Table(table_data, colWidths=[col_rak_w, col_msku_w, col_qty_w], rowHeights=row_heights)
    t.setStyle(TableStyle([
        ('GRID', (0,0), (2,2), 1.0, colors.black),
        ('VALIGN', (0,0), (2,2), 'MIDDLE'),
        ('SPAN', (0,3), (2,3)),
        ('SPAN', (0,4), (2,4)),
        ('BOX', (0,4), (2,4), 1.0, colors.black),
        ('VALIGN', (0,4), (2,4), 'MIDDLE'),
        ('ALIGN', (0,4), (2,4), 'CENTER'),
    ]))
    
    t.wrapOn(can, W_pts, 350)
    t.drawOn(can, 7.0, 100)
    can.save()
    packet.seek(0)
    doc = fitz.open("pdf", packet.read())
    pix = doc[0].get_pixmap(dpi=150)
    pix.save("scratch/test_multi_table_bottom.png")

if __name__ == '__main__':
    test_multi_under_each_item()
    test_multi_under_table()
