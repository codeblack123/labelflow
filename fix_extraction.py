with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """                match = re.search(r'(SPX[A-Z0-9]+|JP[0-9]+|[A-Z0-9]+-[A-Z0-9]+|882[0-9]+|1000[0-9]+|TLID[0-9]+)', full_text)
                if match:
                    final_ids.append(match.group(1))
                else:
                    pesanan_match = re.search(r'([A-Z0-9]{14,})', full_text)
                    if pesanan_match:
                        final_ids.append(pesanan_match.group(1))"""

new_logic = """                awbs = extract_all_awb_candidates(full_text)
                orders = extract_order_ids(full_text)
                
                if awbs:
                    final_ids.extend(awbs)
                if orders:
                    final_ids.extend(orders)"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open('main.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed ID extraction logic")
else:
    print("Could not find old logic in main.py")
