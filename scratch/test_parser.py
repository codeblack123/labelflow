import re

KNOWN_COLORS = {
    'BLACK', 'HITAM', 'BLUE', 'BIRU', 'RED', 'MERAH', 'WHITE', 'PUTIH', 
    'GREEN', 'HIJAU', 'YELLOW', 'KUNING', 'PINK', 'PURPLE', 'UNGU', 
    'ORANGE', 'JINGGA', 'BROWN', 'COKLAT', 'GREY', 'GRAY', 'ABU', 
    'GOLD', 'EMAS', 'SILVER', 'PERAK', 'PASTEL', 'MIX', 'ASSORTED', 'CLEAR'
}
PKG_PREFIX_RE = re.compile(r'^\d*(PACK|BOX|SLOP|LBR|SET|DZ|LUSIN|ROLL|BAG|BTL|TUBE|JAR)$', re.IGNORECASE)
UNIT_SUFFIX_RE = re.compile(r'^\d+(PC|PCS|SET|PACK|BOX|ROLL|LBR|DZ|LUSIN)$', re.IGNORECASE)

def parse_sku_bundling_fields_v2(sku_text: str):
    s = sku_text.strip()
    dash_parts = s.split('-', 1)
    jenis = dash_parts[0].strip()
    rest = dash_parts[1].strip() if len(dash_parts) > 1 else ''
    
    if not rest:
        return jenis or '-', '-', '-'
        
    slash_parts = [p.strip() for p in rest.split('/') if p.strip()]
    if len(slash_parts) >= 3:
        # e.g. PULPEN-1BOX/GP-262/BLUE -> jenis: PULPEN, model: 1BOX/GP-262, varian: BLUE
        model = '/'.join(slash_parts[:-1])
        varian = slash_parts[-1]
    elif len(slash_parts) == 2:
        p0, p1 = slash_parts[0], slash_parts[1]
        p1_upper = p1.upper()
        # Jika part kedua adalah warna atau varian yang jelas
        if p1_upper in KNOWN_COLORS:
            model = p0
            varian = p1
        elif PKG_PREFIX_RE.match(p0):
            # p0 is 1BOX, 1PACK. Cek apakah p1 diakhiri -COLOR (mis. GP-157-BLACK)
            p1_dash = p1.rsplit('-', 1)
            if len(p1_dash) == 2 and p1_dash[1].upper() in KNOWN_COLORS:
                model = f'{p0}/{p1_dash[0]}'
                varian = p1_dash[1]
            else:
                model = f'{p0}/{p1}'
                varian = '-'
        elif UNIT_SUFFIX_RE.match(p1):
            model = f'{p0}/{p1}'
            varian = '-'
        else:
            model = p0
            varian = p1
    else:
        # Tidak ada slash, cek apakah rest diakhiri dengan '-COLOR' (misal: GP-157-BLACK)
        dash_sub = rest.rsplit('-', 1)
        if len(dash_sub) == 2 and dash_sub[1].upper() in KNOWN_COLORS:
            model = dash_sub[0]
            varian = dash_sub[1]
        else:
            model = rest
            varian = '-'
        
    return jenis or '-', model or '-', varian or '-'

test_cases = [
    'PENCILCOLOR-CP-0133-SH12',
    'BOOK-1PACK/CLBK-3501',
    'BOOK-CLBK-3501/1PC',
    'MECHANICALPENCIL-1BOX/MP-70',
    'PULPEN-1BOX/GP-157/BLACK',
    'PULPEN-1BOX/GP-157-BLACK',
    'PULPEN-BP-338/BLACK',
    'CORRECTION-CT-522',
    'ERASER-EB-30/1PCS',
    'MARKER-1BOX/WM-65/1PCS/BLACK',
    'SINGLEWORD'
]
for tc in test_cases:
    j, m, v = parse_sku_bundling_fields_v2(tc)
    has_v = bool(v and v != '-')
    status = 'TERPISAH (ADA VARIAN)' if has_v else 'GABUNG MODEL+VARIAN'
    print(f'{tc:30} -> JENIS: {j:16} | MODEL: {m:18} | VARIAN: {v:8} [{status}]')
