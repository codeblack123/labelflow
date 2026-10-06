import re
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

PKG_PREFIX_PATTERN = re.compile(r'\b(\d*(?:PACK|BOX|SLOP|DRUM|LBR|SET|DZ|LUSIN|ROLL|BAG|BTL|TUBE|JAR))\b', re.IGNORECASE)

def enlarge_bundling_pkg_prefix(html_text: str, base_font_size: float) -> str:
    larger_size = base_font_size + 2.0
    return PKG_PREFIX_PATTERN.sub(
        lambda m: f'<font size="{larger_size:.1f}"><b>{m.group(1)}</b></font>',
        html_text,
        count=1
    )

test_models = [
    '1BOX/GP-369',
    '1PACK/CLBK-3501',
    '1SLOP/SMP-01',
    '1DRUM/ABC-01',
    'CP-0133-SH12',
    '1BOX/MP-70',
    'CLBK-3501/1PC'
]

f_model = 8.0
style = ParagraphStyle('m_style', fontSize=f_model, leading=f_model * 1.4, alignment=1)

for tm in test_models:
    res = enlarge_bundling_pkg_prefix(tm, f_model)
    p = Paragraph(res, style)
    w, h = p.wrap(98, 100)
    print(f'{tm:16} -> {res:48} (h={h})')
