with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Locate the start of our endpoint
start_marker = 'async def toolkit_generate_packing_list('
# Find the end of the df loading and checking
end_marker = 'if df_matched.empty:'

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker, start_idx)
    
    old_code = content[start_idx:end_idx]
    
    # Let's replace the inner parsing logic
    new_code = """async def toolkit_generate_packing_list(
    excel_file: UploadFile = File(...),
    pdf_files: list[UploadFile] = File(...)
):
    try:
        content = await excel_file.read()
        df = pd.read_excel(io.BytesIO(content))
        
        # Normalize columns like process_labels
        col_mapping = {
            'AWB/No. Tracking': ['AWB/No. Tracking', 'AWB', 'No. Tracking', 'Tracking Number', 'Resi', 'No Resi', 'No. Resi'],
            'ID Pesanan': ['ID Pesanan', 'Order ID', 'No. Pesanan', 'Nomor Pesanan'],
            'MSKU': ['MSKU', 'SKU', 'Nama SKU', 'Product SKU', 'Master SKU', 'Nomor Referensi SKU', 'SKU Induk', 'Parent SKU'],
            'Jumlah': ['Jumlah', 'Qty', 'Quantity', 'QTY']
        }
        
        for target_col, alternatives in col_mapping.items():
            if target_col not in df.columns:
                for alt in alternatives:
                    if alt in df.columns:
                        df = df.rename(columns={alt: target_col})
                        break
                        
        # Pastikan kolom string
        if 'AWB/No. Tracking' in df.columns:
            df['AWB/No. Tracking'] = df['AWB/No. Tracking'].astype(str).apply(normalize_awb)
        if 'ID Pesanan' in df.columns:
            df['ID Pesanan'] = df['ID Pesanan'].astype(str).apply(normalize_awb)
            
        final_ids = []
        for pdf_file in pdf_files:
            pdf_content = await pdf_file.read()
            doc = fitz.open(stream=pdf_content, filetype="pdf")
            for page_num in range(len(doc)):
                page = doc[page_num]
                text_instances = page.get_text("dict")["blocks"]
                full_text = " ".join([span["text"] for block in text_instances if "lines" in block for line in block["lines"] for span in line["spans"]])
                
                is_packing_list = 'PACKING LIST / BATCH' in full_text.upper() or 'LIST ID PESANAN' in full_text.upper()
                if is_packing_list:
                    continue
                
                awbs = extract_all_awb_candidates(full_text)
                orders = extract_order_ids(full_text)
                
                if awbs:
                    final_ids.extend([normalize_awb(a) for a in awbs if normalize_awb(a)])
                if orders:
                    final_ids.extend([normalize_awb(o) for o in orders if normalize_awb(o)])
            doc.close()
            
        if not final_ids:
            raise HTTPException(status_code=400, detail="Tidak ada resi/pesanan ditemukan di PDF")
            
        df_matched = df.copy()
        mask = pd.Series(False, index=df.index)
        
        if 'AWB/No. Tracking' in df.columns:
            mask = mask | df['AWB/No. Tracking'].isin(final_ids)
            if 'ID Pesanan' in df.columns:
                mask = mask | (df['AWB/No. Tracking'].isna() & df['ID Pesanan'].isin(final_ids))
                mask = mask | (df['AWB/No. Tracking'] == 'NAN') & df['ID Pesanan'].isin(final_ids)
                mask = mask | (df['AWB/No. Tracking'] == '') & df['ID Pesanan'].isin(final_ids)
        elif 'ID Pesanan' in df.columns:
            mask = mask | df['ID Pesanan'].isin(final_ids)
            
        df_matched = df_matched[mask]
        
        """
    
    new_content = content[:start_idx] + new_code + content[end_idx:]
    
    # Also fix the sku_col logic which might be outdated since we renamed to MSKU and Jumlah
    new_content = new_content.replace(
"""        sku_col = next((col for col in ['Nomor Referensi SKU', 'SKU Induk', 'SKU', 'Parent SKU'] if col in df_matched.columns), None)
        qty_col = 'Jumlah' if 'Jumlah' in df_matched.columns else 'Quantity'
        pesanan_col = 'No. Pesanan' if 'No. Pesanan' in df_matched.columns else 'Order ID'
        
        if not sku_col:
            sku_col = 'SKU'
            df_matched[sku_col] = 'Unknown'
        if qty_col not in df_matched.columns:
            df_matched[qty_col] = 1
        if pesanan_col not in df_matched.columns:
            df_matched[pesanan_col] = ''
            
        packing_df = df_matched.groupby(sku_col).agg({
            qty_col: 'sum',
            pesanan_col: lambda x: ', '.join(x.astype(str).unique())
        }).reset_index()
        
        final_df = pd.DataFrame()
        final_df['ID'] = [''] * len(packing_df)
        final_df['SKU'] = packing_df[sku_col]
        final_df['QTY'] = packing_df[qty_col]
        final_df['NO. PESANAN'] = packing_df[pesanan_col]""",
"""        sku_col = 'MSKU' if 'MSKU' in df_matched.columns else 'SKU'
        qty_col = 'Jumlah' if 'Jumlah' in df_matched.columns else 'QTY'
        pesanan_col = 'ID Pesanan' if 'ID Pesanan' in df_matched.columns else 'NO. PESANAN'
        
        if sku_col not in df_matched.columns:
            df_matched[sku_col] = 'Unknown'
        if qty_col not in df_matched.columns:
            df_matched[qty_col] = 1
        if pesanan_col not in df_matched.columns:
            df_matched[pesanan_col] = ''
            
        packing_df = df_matched.groupby(sku_col).agg({
            qty_col: 'sum',
            pesanan_col: lambda x: ', '.join(x.astype(str).unique())
        }).reset_index()
        
        final_df = pd.DataFrame()
        final_df['ID'] = [''] * len(packing_df)
        final_df['SKU'] = packing_df[sku_col]
        final_df['QTY'] = packing_df[qty_col]
        final_df['NO. PESANAN'] = packing_df[pesanan_col]"""
    )
    
    with open('main.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed column extraction logic!")
else:
    print("Markers not found")
