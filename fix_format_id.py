with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "        col_msku = 'MSKU' if 'MSKU' in df_matched.columns else 'SKU'"
end_marker = "        output = io.BytesIO()"

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker, start_idx)
    
    new_logic = """        col_msku = 'MSKU' if 'MSKU' in df_matched.columns else 'SKU'
        col_qty = 'Jumlah' if 'Jumlah' in df_matched.columns else 'QTY'
        col_id = 'ID Pesanan' if 'ID Pesanan' in df_matched.columns else 'NO. PESANAN'
        col_notes = 'Catatan Pembeli' if 'Catatan Pembeli' in df_matched.columns else None
        
        if col_msku not in df_matched.columns:
            df_matched[col_msku] = 'Unknown'
        if col_qty not in df_matched.columns:
            df_matched[col_qty] = 1
        if col_id not in df_matched.columns:
            df_matched[col_id] = ''
            
        # 1. Fetch Mapping ID & Rak
        rak_map = {}
        try:
            mappings = await get_sku_mappings()
            rak_map = {m['sku'].strip().upper(): {"rak": m.get('rak', ''), "id": m.get('id', '')} for m in mappings}
        except Exception as e:
            print(f"[PACKING LIST] Failed to fetch mappings: {e}")
            
        results = []
        for msku, group in df_matched.groupby(col_msku):
            total_qty = group[col_qty].sum()
            
            # Sub-group by Order ID to aggregate Qty per Order
            order_groups = group.groupby(col_id)[col_qty].sum()
            
            # Format: ID(Qty) sorted by ID
            detail_strs = []
            for oid, qty in sorted(order_groups.items()):
                 detail_strs.append(f"{oid}({int(qty)})")
            
            joined_details = '\\n'.join(detail_strs)
            
            # Get Catatan Pembeli (Buyer Notes)
            notes_list = []
            if col_notes:
                for note in group[col_notes]:
                    if pd.notna(note) and str(note).strip():
                        notes_list.append(str(note).strip())
            
            # Format: SKU\\nCatatan Pembeli:notes (or - if empty)
            if notes_list:
                unique_notes = list(set(notes_list))
                notes_str = '; '.join(unique_notes)
                sku_with_notes = f"{msku}\\nCatatan Pembeli:{notes_str}"
            else:
                sku_with_notes = f"{msku}\\nCatatan Pembeli:-"

            # Get ID Rak
            sku_upper = str(msku).strip().upper()
            rak_info = rak_map.get(sku_upper, {"rak": "", "id": ""})
            id_val = rak_info.get('id', '')
            rak_val = rak_info.get('rak', '')
            display_id = id_val if id_val else (rak_val if rak_val else '-')

            results.append({
                'ID': display_id,
                'SKU': sku_with_notes,
                'QTY': int(total_qty),
                'NO. PESANAN': joined_details,
                '_raw_sku': sku_upper
            })
            
        final_df = pd.DataFrame(results)
        
        # Sort by priority and QTY descending
        # Fetch Priority Bottom List
        priority_skus = set()
        try:
            p_data = await supabase_fetch("GET", "sku_priority_bottom?select=sku")
            priority_skus = {p['sku'].strip().upper() for p in p_data}
        except Exception:
            pass

        def get_priority(sku):
            return 1 if sku in priority_skus else 0

        if not final_df.empty:
            final_df['priority'] = final_df['_raw_sku'].apply(get_priority)
            final_df = final_df.sort_values(by=['priority', 'QTY'], ascending=[True, False])
            final_df = final_df.drop(columns=['priority', '_raw_sku'])
        
"""
    
    new_content = content[:start_idx] + new_logic + content[end_idx:]
    with open('main.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed formatting logic and ID Rak!")
else:
    print("Markers not found")
