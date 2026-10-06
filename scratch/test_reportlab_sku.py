import re
import html
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase.pdfmetrics import stringWidth

def format_msku_for_wrapping(msku: str, font_name: str, font_size: float, max_width: float) -> str:
    tokens = re.split(r'([-/])', msku)
    lines = []
    current_line = ""
    for token in tokens:
        if not token: continue
        if token in ('-', '/'):
            current_line += token
        else:
            if current_line and stringWidth(current_line + token, font_name, font_size) > max_width:
                lines.append(current_line)
                current_line = token
            else:
                current_line += token
    if current_line:
        lines.append(current_line)
    return "<br/>".join(html.escape(line) for line in lines)

PKG_PATTERN = re.compile(r'(\b\d*(?:BOX|DRUM|PACK|SLOP|SET|DZ|LUSIN|ROLL|BAG|BTL|TUBE|JAR|LBR)\b)', re.IGNORECASE)

def enlarge_pkg_token(html_text: str, base_font_size: float) -> str:
    larger_size = base_font_size + 2.0
    return PKG_PATTERN.sub(
        lambda m: f'<font size="{larger_size:.1f}"><b>{m.group(1)}</b></font>',
        html_text,
        count=1
    )

def test_full():
    raw_sku = "MARKER-1BOX/WM-60/BLACK"
    font_name = "Helvetica"
    font_size = 10.5
    col_w = 142.0 # 150 - 8

    # Step 1: Wrap SKU
    wrapped = format_msku_for_wrapping(raw_sku, font_name, font_size, col_w)
    print("Wrapped:", wrapped)

    # Step 2: Enlarge & bold packaging unit
    enlarged = enlarge_pkg_token(wrapped, font_size)
    print("Enlarged:", enlarged)

    # Step 3: Render Paragraph
    style = ParagraphStyle(
        'msku_style',
        fontSize=font_size,
        fontName=font_name,
        leading=16
    )
    p = Paragraph(enlarged, style)
    w, h = p.wrap(col_w, 9999)
    print(f"Wrapped paragraph: width={w}, height={h}")

if __name__ == '__main__':
    test_full()
