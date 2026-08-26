
import sys
import re

with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new sorting function body
new_sort_logic = """        def rak_id_sort_key(item):
            sku_upper = item['msku'].strip().upper()
            rak_info  = rak_map.get(sku_upper, {"rak": "", "id": ""})
            rak_val   = rak_info.get('rak', '')
            id_val    = rak_info.get('id', '')

            # Bangun string Rak & ID
            if id_val and rak_val and not id_val.upper().startswith(rak_val.upper()):
                combined = f"{rak_val}-{id_val}"
            else:
                combined = id_val or rak_val or ""

            # Logika Prioritas:
            # Jika fitur Sort MSKU aktif dan Rak kosong -> PRIORITAS 0 (Paling Atas)
            # Jika Rak ada -> PRIORITAS 1
            if is_sort_rak_msku and not combined:
                priority = 0
                sort_string = sku_upper
            elif not combined:
                # Jika fitur OFF tapi rak kosong, tetap paling atas atau bawah? 
                # Ikuti permintaan: "muncul paling atas"
                priority = 0
                sort_string = sku_upper
            else:
                priority = 1
                sort_string = combined

            # Pecah berdasarkan '-'
            parts = sort_string.split('-') if sort_string else []
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

            return (priority, zone_val, num_rest, sku_upper)"""

# Use regex to find and replace the function definitions
# We look for the start of the function and replace until the return line.

# Pattern for the first occurrence
pattern1 = r'def rak_id_sort_key\(item\):.*?return \(len\(zone\), zone\.upper\(\), num_rest\)'
content = re.sub(pattern1, new_sort_logic, content, flags=re.DOTALL)

# Pattern for the second occurrence (after previous edit, it might be different)
# Wait, I already updated the return line in the first successful edit!
# It was: return (len(zone), zone.upper(), num_rest)
# Let's check the current content.
with open('main.py', 'w', encoding='utf-8') as f:
    f.write(content)
