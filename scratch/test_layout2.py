import io
import re
import fitz
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle, Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics

KNOWN_SKU_COLORS = {
    'BLACK', 'HITAM', 'BLUE', 'BIRU', 'RED', 'MERAH', 'WHITE', 'PUTIH', 
    'GREEN', 'HIJAU', 'YELLOW', 'KUNING', 'PINK', 'PURPLE', 'UNGU', 
    'ORANGE', 'JINGGA', 'BROWN', 'COKLAT', 'GREY', 'GRAY', 'ABU', 
    'GOLD', 'EMAS', 'SILVER', 'PERAK', 'PASTEL', 'MIX', 'ASSORTED', 'CLEAR'
}
PKG_PREFIX_RE = re.compile(r'^\d*(PACK|BOX|SLOP|DRUM|LBR|SET|DZ|LUSIN|ROLL|BAG|BTL|TUBE|JAR)$', re.IGNORECASE)
UNIT_SUFFIX_RE = re.compile(r'^\d+(PC|PCS|SET|PACK|BOX|ROLL|LBR|DZ|LUSIN)$', re.IGNORECASE)
PKG_BUNDLE_ENLARGE_RE = re.compile(r'\b(\d+(?:PACK|BOX|SLOP|DRUM|LBR|SET|DZ|LUSIN|ROLL|BAG|BTL|TUBE|JAR))\b', re.IGNORECASE)

def enlarge_bundling_pkg_prefix(html_text: str, base_font_size: float) -> str:
    larger_size = base_font_size + 2.0
    return PKG_BUNDLE_ENLARGE_RE.sub(
        lambda m: f'<font size="{larger_size:.1f}"><b>{m.group(1)}</b></font>',
        html_text,
        count=1
    )

def parse_sku_bundling_fields(sku_text: str):
    s = sku_text.strip()
    dash_parts = s.split('-', 1)
    jenis = dash_parts[0].strip()
    rest = dash_parts[1].strip() if len(dash_parts) > 1 else ''
    
    if not rest:
        return jenis or "-", "-", "-"
        
    slash_parts = [p.strip() for p in rest.split('/') if p.strip()]
    if len(slash_parts) >= 3:
        model = '/'.join(slash_parts[:-1])
        varian = slash_parts[-1]
    elif len(slash_parts) == 2:
        p0, p1 = slash_parts[0], slash_parts[1]
        p1_upper = p1.upper()
        if p1_upper in KNOWN_SKU_COLORS:
            model = p0
            varian = p1
        elif PKG_PREFIX_RE.match(p0):
            p1_dash = p1.rsplit('-', 1)
            if len(p1_dash) == 2 and p1_dash[1].upper() in KNOWN_SKU_COLORS:
                model = f"{p0}/{p1_dash[0]}"
                varian = p1_dash[1]
            else:
                model = f"{p0}/{p1}"
                varian = "-"
        elif UNIT_SUFFIX_RE.match(p1):
            model = f"{p0}/{p1}"
            varian = "-"
        else:
            model = p0
            varian = p1
    else:
        dash_sub = rest.rsplit('-', 1)
        if len(dash_sub) == 2 and dash_sub[1].upper() in KNOWN_SKU_COLORS:
            model = dash_sub[0]
            varian = dash_sub[1]
        else:
            model = rest
            varian = "-"
        
    return jenis or "-", model or "-", varian or "-"

def test_bundling_v4(picker_name, filename):
    W_pts, H_pts = 283.46, 425.20
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=(W_pts, H_pts))
    
    col_widths = [90.0, 98.0, 46.0, 36.0]
    col_jenis_w, col_model_w, col_varian_w, col_qty_w = col_widths
    total_table_w = sum(col_widths)
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
    clean_pic = str(picker_name).strip().upper()
    pic_text = f"PIC : {clean_pic}"
    p_fs = min(7.5, f_model)
    while p_fs > 4.5 and pdfmetrics.stringWidth(pic_text, 'Helvetica-Bold', p_fs) > (usable_model_w - 4.0):
        p_fs -= 0.25
    nbsp_pic = clean_pic.replace(' ', '&nbsp;')
    model_hdr_html = f"<b>MODEL &nbsp;|</b><br/><font size=\"{p_fs:.1f}\"><b>PIC&nbsp;:&nbsp;{nbsp_pic}</b></font>"
    m_lead = max(8.5, round(p_fs * 1.35))
    m_fs = p_fs
        
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
    hdr_style_varian = ParagraphStyle(
        'hdr_v',
        fontSize=max(8.5, f_varian * 1.1),
        fontName='Helvetica-Bold',
        alignment=1,
        leading=max(12, round(f_varian * 1.5)),
        textColor=hdr_txt
    )
    varian_header_para = Paragraph('VARIAN', hdr_style_varian)
    
    # 4. QTY
    hdr_style_qty = ParagraphStyle(
        'hdr_q',
        fontSize=max(8.5, f_qty * 0.75),
        fontName='Helvetica-Bold',
        alignment=1,
        leading=max(12, round(f_qty * 0.9)),
        textColor=hdr_txt
    )
    qty_header_para = Paragraph('QTY', hdr_style_qty)
    
    table_data = [[jenis_header_para, model_header_para, varian_header_para, qty_header_para]]
    
    hdr_w_j, hdr_h_j = jenis_header_para.wrap(col_jenis_w - 8, 9999)
    hdr_w_m, hdr_h_m = model_header_para.wrap(usable_model_w, 9999)
    hdr_w_v, hdr_h_v = varian_header_para.wrap(col_varian_w - 8, 9999)
    hdr_w_q, hdr_h_q = qty_header_para.wrap(col_qty_w - 6, 9999)
    header_h = max(20.0, hdr_h_j + 6, hdr_h_m + 6, hdr_h_v + 6, hdr_h_q + 6)
    row_heights = [header_h]
    span_cmds = []
    
    model_style = ParagraphStyle(
        'model_s',
        fontSize=f_model,
        leading=max(11, round(f_model * 1.35)),
        fontName='Helvetica',
        alignment=1
    )
    varian_style = ParagraphStyle(
        'varian_s',
        fontSize=f_varian,
        leading=max(11, round(f_varian * 1.35)),
        fontName='Helvetica',
        alignment=1
    )

    # Database SKU Bundling simulated map
    b_map = {
        'MECHANICALPENCIL-1BOX/MP-70': 'SATUAN',
        'PULPEN-1BOX/GP-369/BLUE': 'SATUAN',
        'BOOK-1PACK/CLBK-3501': 'SATUAN',
    }

    items = [
        # 1. Non-bundling (not in DB)
        {'msku': 'PENCILCOLOR-CP-0133-SH12', 'jumlah': 12},
        # 2. Bundling in DB without varian (1BOX enlarged +2pt)
        {'msku': 'MECHANICALPENCIL-1BOX/MP-70', 'jumlah': 22},
        # 3. Bundling in DB with varian (1BOX enlarged +2pt)
        {'msku': 'PULPEN-1BOX/GP-369/BLUE', 'jumlah': 12},
        # 4. Bundling in DB without varian (1PACK enlarged +2pt)
        {'msku': 'BOOK-1PACK/CLBK-3501', 'jumlah': 1},
    ]
    
    model_varian_span_w = (col_model_w + col_varian_w) - 8
    
    for item in items:
        raw_sku = item['msku']
        row_idx = len(table_data)
        
        jenis, model, varian = parse_sku_bundling_fields(raw_sku)
        has_varian = bool(varian and varian.strip() not in ('-', ''))
        
        clean_sku_upper = raw_sku.strip().upper()
        is_in_bundling_db = bool(b_map and (clean_sku_upper in b_map or f"{jenis}-{model}".strip().upper() in b_map))
        
        usable_j = col_jenis_w - 6.0
        actual_f_j = f_jenis
        while actual_f_j > 6.5 and pdfmetrics.stringWidth(jenis, 'Helvetica', actual_f_j) > usable_j:
            actual_f_j -= 0.25
        j_style = ParagraphStyle(
            f'j_{actual_f_j}',
            fontSize=actual_f_j,
            leading=max(10, round(actual_f_j * 1.3)),
            fontName='Helvetica',
            alignment=1
        )
        jenis_p = Paragraph(jenis, j_style)
        _, jh = jenis_p.wrap(usable_j, 9999)
        
        if not has_varian:
            formatted_model = model
            if is_in_bundling_db:
                formatted_model = enlarge_bundling_pkg_prefix(formatted_model, f_model)
            model_p = Paragraph(formatted_model, model_style)
            _, mh = model_p.wrap(model_varian_span_w, 9999)
            table_data.append([jenis_p, model_p, '', str(item['jumlah'])])
            row_heights.append(max(row_height, jh + 4, mh + 4))
            span_cmds.append(('SPAN', (1, row_idx), (2, row_idx)))
            span_cmds.append(('ALIGN', (1, row_idx), (2, row_idx), 'CENTER'))
        else:
            formatted_model = model
            if is_in_bundling_db:
                formatted_model = enlarge_bundling_pkg_prefix(formatted_model, f_model)
            model_p = Paragraph(formatted_model, model_style)
            _, mh = model_p.wrap(col_model_w - 8, 9999)
            varian_p = Paragraph(varian, varian_style)
            _, vh = varian_p.wrap(col_varian_w - 6, 9999)
            table_data.append([jenis_p, model_p, varian_p, str(item['jumlah'])])
            row_heights.append(max(row_height, jh + 4, mh + 4, vh + 4))
            
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
        ('ALIGN', (3, 1), (3, -1), 'CENTER'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ] + span_cmds
    
    t = Table(table_data, colWidths=col_widths, rowHeights=row_heights)
    t.setStyle(TableStyle(style))
    t.wrapOn(c, W_pts, H_pts)
    
    table_x = 7.0
    table_y = H_pts - 60 - sum(row_heights)
    
    c.setLineWidth(0.5)
    c.setStrokeColor(colors.black)
    c.line(7.0, H_pts - 40, 7.0 + total_table_w, H_pts - 40)
    
    t.drawOn(c, table_x, table_y)
    c.save()
    
    packet.seek(0)
    doc = fitz.open('pdf', packet.read())
    pix = doc[0].get_pixmap(dpi=150)
    pix.save(filename)
    print(f'Saved {filename}: {pix.width}x{pix.height}')

test_bundling_v4('APRILIA MAULIDA NINGRUM', 'scratch/test_v4.png')
