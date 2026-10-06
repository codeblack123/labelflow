from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfgen import canvas
import io
import fitz

style = ParagraphStyle(
    'test_model',
    fontSize=8.0,
    leading=11.0,
    fontName='Helvetica',
    alignment=1
)

text_html = '<font size="10.0"><b>1BOX</b></font>/GP-369'
p = Paragraph(text_html, style)
w, h = p.wrap(90, 100)
print(f'Paragraph wrapped successfully: w={w}, h={h}')

packet = io.BytesIO()
c = canvas.Canvas(packet, pagesize=(200, 200))
p.drawOn(c, 50, 150)
c.save()

packet.seek(0)
doc = fitz.open('pdf', packet.read())
print(f'PDF generated with {len(doc)} pages')
