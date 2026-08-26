
import re

with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new rak_id_sort_key
new_rak_key = """        def rak_id_sort_key(item):
            sku_upper = item['msku'].strip().upper()
            rak_info  = rak_map.get(sku_upper, {"rak": "", "id": ""})
            rak_val   = rak_info.get('rak', '')
            id_val    = rak_info.get('id', '')

            if id_val and rak_val and not id_val.upper().startswith(rak_val.upper()):
                combined = f"{rak_val}-{id_val}"
            else:
                combined = id_val or rak_val or ""

            parts = combined.split('-') if combined else []
            zone  = parts[0] if parts else ''
            rest  = parts[1:] if len(parts) > 1 else []

            num_rest = []
            for p in rest:
                try:
                    num_rest.append((0, int(p)))
                except ValueError:
                    num_rest.append((1, p))

            try:
                zone_val = (0, int(zone))
            except ValueError:
                zone_val = (1, zone.upper())

            priority = 1 if not combined else 0
            return (priority, zone_val, num_rest, sku_upper)"""

# Define the new interleaving block
new_sort_block = """        for awb in awb_to_items:
            if is_extended:
                if is_sort_rak_msku:
                    rak_items = []
                    no_rak_items = []
                    for item in awb_to_items[awb]:
                        sku_upper = item['msku'].strip().upper()
                        rak_info = rak_map.get(sku_upper, {"rak": "", "id": ""})
                        rak_val = rak_info.get('rak', '')
                        id_val = rak_info.get('id', '')
                        if id_val and rak_val and not id_val.upper().startswith(rak_val.upper()):
                            combined = f"{rak_val}-{id_val}"
                        else:
                            combined = id_val or rak_val or ""
                        
                        if combined:
                            rak_items.append(item)
                        else:
                            no_rak_items.append(item)
                    
                    rak_items.sort(key=rak_id_sort_key)
                    no_rak_items.sort(key=lambda x: x['msku'].strip().upper())
                    
                    result = []
                    rak_idx = 0
                    for no_rak in no_rak_items:
                        no_rak_msku = no_rak['msku'].strip().upper()
                        while rak_idx < len(rak_items):
                            if rak_items[rak_idx]['msku'].strip().upper() > no_rak_msku:
                                break
                            result.append(rak_items[rak_idx])
                            rak_idx += 1
                        result.append(no_rak)
                    
                    while rak_idx < len(rak_items):
                        result.append(rak_items[rak_idx])
                        rak_idx += 1
                        
                    awb_to_items[awb] = result
                else:
                    awb_to_items[awb].sort(key=rak_id_sort_key)
            else:
                awb_to_items[awb].sort(key=lambda x: x['msku'])"""

# Replace in process_labels
# We need to find the old def rak_id_sort_key(item): ... return (priority, zone_val, num_rest, sku_upper)
patt1 = r'        def rak_id_sort_key\(item\):.*?return \(priority, zone_val, num_rest, sku_upper\)'
content = re.sub(patt1, new_rak_key, content, count=2, flags=re.DOTALL)

# Replace the sorting loop
patt2 = r'        for awb in awb_to_items:\n            if is_extended:\n                awb_to_items\[awb\]\.sort\(key=rak_id_sort_key\)\n            else:\n                awb_to_items\[awb\]\.sort\(key=lambda x: x\[\'msku\'\]\)'
content = re.sub(patt2, new_sort_block, content, count=2)

with open('main.py', 'w', encoding='utf-8') as f:
    f.write(content)
