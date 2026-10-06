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
badge_style = ParagraphStyle('Badge', fontSize=10.5, fontName='Helvetica-Bold', alignment=1, leading=13)

# Style 1: All items in table, then badges below the table
def sim_badges_at_bottom():
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=(W_pts, 350))
    
    table_data = [
        [Paragraph('<b>Rak & ID</b>', hdr_style), Paragraph('<b>MSKU | PIC : SADAM</b>', hdr_style), Paragraph('<b>Qty</b>', hdr_style)],
        [Paragraph('<b>11-EA-04-10</b>', rak_style), Paragraph('<b>MARKER-PM-76/1PC/BLACK</b>', sku_style), Paragraph('<b>5</b>', qty_style)],
        [Paragraph('<b>4-AG-03-10</b>', rak_style), Paragraph('<b>PULPEN-1BOX/JK-100NDL/BLUE</b>', sku_style), Paragraph('<b>1</b>', qty_style)],
        ['', '', ''],
        [Paragraph('<b>CEK KODE: PM-76/1PC/BLACK</b>', badge_style), '', ''],
        ['', '', ''],
        [Paragraph('<b>CEK KODE: 1BOX/JK-100NDL/BLUE</b>', badge_style), '', ''],
    ]
    
    row_heights = [18, 26, 26, 3, 20, 2, 20]
    t = Table(table_data, colWidths=[col_rak_w, col_msku_w, col_qty_w], rowHeights=row_heights)
    t.setStyle(TableStyle([
        ('GRID', (0,0), (2,2), 1.0, colors.black),
        ('VALIGN', (0,0), (2,2), 'MIDDLE'),
        ('SPAN', (0,3), (2,3)),
        ('SPAN', (0,4), (2,4)),
        ('BOX', (0,4), (2,4), 1.2, colors.black),
        ('VALIGN', (0,4), (2,4), 'MIDDLE'),
        ('ALIGN', (0,4), (2,4), 'CENTER'),
        ('SPAN', (0,5), (2,5)),
        ('SPAN', (0,6), (2,6)),
        ('BOX', (0,6), (2,6), 1.2, colors.black),
        ('VALIGN', (0,6), (2,6), 'MIDDLE'),
        ('ALIGN', (0,6), (2,6), 'CENTER'),
    ]))
    
    t.wrapOn(can, W_pts, 350)
    t.drawOn(can, 7.0, 100)
    can.save()
    packet.seek(0)
    doc = fitz.open("pdf", packet.read())
    doc[0].get_pixmap(dpi=150).save("scratch/sim_badges_bottom.png")

# Style 2: Each item has badge directly underneath it
def sim_badges_each_item():
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=(W_pts, 350))
    
    table_data = [
        [Paragraph('<b>Rak & ID</b>', hdr_style), Paragraph('<b>MSKU | PIC : SADAM</b>', hdr_style), Paragraph('<b>Qty</b>', hdr_style)],
        [Paragraph('<b>11-EA-04-10</b>', rak_style), Paragraph('<b>MARKER-PM-76/1PC/BLACK</b>', sku_style), Paragraph('<b>5</b>', qty_style)],
        ['', '', ''],
        [Paragraph('<b>CEK KODE: PM-76/1PC/BLACK</b>', badge_style), '', ''],
        ['', '', ''],
        [Paragraph('<b>4-AG-03-10</b>', rak_style), Paragraph('<b>PULPEN-1BOX/JK-100NDL/BLUE</b>', sku_style), Paragraph('<b>1</b>', qty_style)],
        ['', '', ''],
        [Paragraph('<b>CEK KODE: 1BOX/JK-100NDL/BLUE</b>', badge_style), '', ''],
    ]
    
    row_heights = [18, 26, 3, 20, 3, 26, 3, 20]
    t = Table(table_data, colWidths=[col_rak_w, col_msku_w, col_qty_w], rowHeights=row_heights)
    t.setStyle(TableStyle([
        ('GRID', (0,0), (2,1), 1.0, colors.black),
        ('VALIGN', (0,0), (2,1), 'MIDDLE'),
        ('SPAN', (0,2), (2,2)),
        ('SPAN', (0,3), (2,3)),
        ('BOX', (0,3), (2,3), 1.2, colors.black),
        ('VALIGN', (0,3), (2,3), 'MIDDLE'),
        ('ALIGN', (0,3), (2,3), 'CENTER'),
        ('SPAN', (0,4), (2,4)),
        ('GRID', (0,5), (2,5), 1.0, colors.black),
        ('VALIGN', (0,5), (2,5), 'MIDDLE'),
        ('SPAN', (0,6), (2,6)),
        ('SPAN', (0,7), (2,7)),
        ('BOX', (0,7), (2,7), 1.2, colors.black),
        ('VALIGN', (0,7), (2,7), 'MIDDLE'),
        ('ALIGN', (0,7), (2,7), 'CENTER'),
    ]))
    
    t.wrapOn(can, W_pts, 350)
    t.drawOn(can, 7.0, 100)
    can.save()
    packet.seek(0)
    doc = fitz.open("pdf", packet.read())
    doc[0].get_pixmap(dpi=150).save("scratch/sim_badges_each.png")

if __name__ == '__main__':
    sim_badges_at_bottom()
    sim_badges_each_item()
