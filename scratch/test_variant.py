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

def test_variant_attached():
    # If CEK KODE is an attached spanned row:
    # Row 0: Header
    # Row 1: Item 1
    # Row 2: CEK KODE (Item 1)
    # Row 3: Item 2
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=(W_pts, 350))
    table_data = [
        [Paragraph('<b>Rak & ID</b>', hdr_style), Paragraph('<b>MSKU | PIC : SADAM</b>', hdr_style), Paragraph('<b>Qty</b>', hdr_style)],
        [Paragraph('<b>11-EA-04-10</b>', rak_style), Paragraph('<b>MARKER-PM-76/1PC/BLACK</b>', sku_style), Paragraph('<b>5</b>', qty_style)],
        [Paragraph('<b>CEK KODE: PM-76/1PC/BLACK</b>', badge_style), '', ''],
        [Paragraph('<b>13-FF-02-05</b>', rak_style), Paragraph('<b>PENCILCOLOR-CP-0133-SH12</b>', sku_style), Paragraph('<b>12</b>', qty_style)],
    ]
    t = Table(table_data, colWidths=[col_rak_w, col_msku_w, col_qty_w], rowHeights=[18, 26, 20, 26])
    t.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 1.0, colors.black),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('SPAN', (0,2), (2,2)),
        ('ALIGN', (0,2), (2,2), 'CENTER'),
    ]))
    t.wrapOn(can, W_pts, 350)
    t.drawOn(can, 7.0, 100)
    can.save()
    packet.seek(0)
    doc = fitz.open("pdf", packet.read())
    doc[0].get_pixmap(dpi=150).save("scratch/test_variant_attached_multi.png")

test_variant_attached()
