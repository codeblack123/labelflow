import re

def natural_sort_key(s):
    normalized_s = str(s).strip().upper()
    if normalized_s.startswith('BT-'):
        normalized_s = normalized_s.replace('BT-', 'BT1-', 1)
    elif normalized_s.startswith('T-'):
        normalized_s = normalized_s.replace('T-', 'T2-', 1)
    return [int(text) if text.isdigit() else text.lower() for text in re.split('([0-9]+)', normalized_s)]

rak_map = {
    'MECHANICALPENCIL-1BOX/MP-70': {'rak': '12', 'id': '12-EK-06-22'},
    'PENCILCOLOR-CP-0133-SH12': {'rak': '2', 'id': '2-O-01-03'},
    'BOOK-1PACK/CLBK-3501': {'rak': '14', 'id': '14-B-02-05'},
    'PULPEN-1BOX/GP-157/BLACK': {'rak': '1', 'id': '1-A-01-01'},
}

def rak_id_sort_key(item):
    sku_upper = item['msku'].strip().upper()
    rak_info  = rak_map.get(sku_upper, {"rak": "", "id": ""})
    rak_val   = rak_info.get('rak', '')
    id_val    = rak_info.get('id', '')
    combined  = id_val if id_val else rak_val

    parts = combined.split('-') if combined else []
    zone  = parts[0] if parts else ''
    rest  = parts[1:] if len(parts) > 1 else []

    num_rest = []
    for p in rest:
        try:
            num_rest.append((0, int(p)))
        except ValueError:
            num_rest.append((1, p.upper()))

    try:
        zone_val = (0, int(zone))
    except ValueError:
        zone_val = (1, zone.upper())

    priority = 1 if not combined else 0
    return (priority, zone_val, num_rest, sku_upper)

# Test items inside a multi-item resi
multi_items = [
    {'msku': 'MECHANICALPENCIL-1BOX/MP-70', 'jumlah': 22},
    {'msku': 'PENCILCOLOR-CP-0133-SH12', 'jumlah': 12},
    {'msku': 'BOOK-1PACK/CLBK-3501', 'jumlah': 1},
    {'msku': 'PULPEN-1BOX/GP-157/BLACK', 'jumlah': 2},
]

sorted_multi = sorted(multi_items, key=rak_id_sort_key)
print('--- Multi-item resi internal sort by Rak & ID ---')
for idx, it in enumerate(sorted_multi):
    r = rak_map[it['msku']]
    print(f"{idx+1}. {it['msku']} (Rak: {r['rak']}, ID: {r['id']})")

# Test pages (single-item resis) sorting by Rak & ID
pages = [
    {'awb': 'AWB_1', 'msku': 'MECHANICALPENCIL-1BOX/MP-70'},
    {'awb': 'AWB_2', 'msku': 'PENCILCOLOR-CP-0133-SH12'},
    {'awb': 'AWB_3', 'msku': 'BOOK-1PACK/CLBK-3501'},
    {'awb': 'AWB_4', 'msku': 'PULPEN-1BOX/GP-157/BLACK'},
]

def page_sort_key(p):
    r = rak_map.get(p['msku'], {})
    return (1, 0, natural_sort_key(r.get('rak', 'ZZZZ')), natural_sort_key(r.get('id', 'ZZZZ')), natural_sort_key(p['msku']))

sorted_pages = sorted(pages, key=page_sort_key)
print('\n--- Label/Page sort by Rak & ID ---')
for idx, p in enumerate(sorted_pages):
    r = rak_map[p['msku']]
    print(f"{idx+1}. {p['awb']} -> {p['msku']} (Rak: {r['rak']}, ID: {r['id']})")
