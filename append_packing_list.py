import os

endpoint_code = """
@app.post("/toolkit/generate-packing-list")
async def toolkit_generate_packing_list(
    excel_file: UploadFile = File(...),
    pdf_files: list[UploadFile] = File(...)
):
    try:
        content = await excel_file.read()
        df = pd.read_excel(io.BytesIO(content))
        
        if 'No. Resi' in df.columns:
            df['No. Resi'] = df['No. Resi'].astype(str).str.strip()
        if 'No. Pesanan' in df.columns:
            df['No. Pesanan'] = df['No. Pesanan'].astype(str).str.strip()
            
        final_ids = []
        for pdf_file in pdf_files:
            pdf_content = await pdf_file.read()
            doc = fitz.open(stream=pdf_content, filetype="pdf")
            for page_num in range(len(doc)):
                page = doc[page_num]
                text_instances = page.get_text("dict")["blocks"]
                full_text = " ".join([span["text"] for block in text_instances if "lines" in block for line in block["lines"] for span in line["spans"]])
                
                # Check if this page is a Packing List itself, skip
                is_packing_list = 'PACKING LIST / BATCH' in full_text.upper() or 'LIST ID PESANAN' in full_text.upper()
                if is_packing_list:
                    continue
                
                match = re.search(r'(SPX[A-Z0-9]+|JP[0-9]+|[A-Z0-9]+-[A-Z0-9]+|882[0-9]+|1000[0-9]+|TLID[0-9]+)', full_text)
                if match:
                    final_ids.append(match.group(1))
                else:
                    pesanan_match = re.search(r'([A-Z0-9]{14,})', full_text)
                    if pesanan_match:
                        final_ids.append(pesanan_match.group(1))
            doc.close()
            
        if not final_ids:
            raise HTTPException(status_code=400, detail="Tidak ada resi/pesanan ditemukan di PDF")
            
        df_matched = df.copy()
        mask = pd.Series(False, index=df.index)
        
        if 'No. Resi' in df.columns:
            mask = mask | df['No. Resi'].isin(final_ids)
            if 'No. Pesanan' in df.columns:
                mask = mask | (df['No. Resi'].isna() & df['No. Pesanan'].isin(final_ids))
                mask = mask | (df['No. Resi'] == 'nan') & df['No. Pesanan'].isin(final_ids)
        elif 'No. Pesanan' in df.columns:
            mask = mask | df['No. Pesanan'].isin(final_ids)
            
        df_matched = df_matched[mask]
        
        if df_matched.empty:
            raise HTTPException(status_code=400, detail="Tidak ada data Excel yang cocok dengan PDF")
            
        sku_col = next((col for col in ['Nomor Referensi SKU', 'SKU Induk', 'SKU', 'Parent SKU'] if col in df_matched.columns), None)
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
        final_df['NO. PESANAN'] = packing_df[pesanan_col]
        
        # Sort by QTY descending
        final_df = final_df.sort_values(by=['QTY'], ascending=False)
        
        output = io.BytesIO()
        final_df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": 'attachment; filename="packing_list_toolkit.xlsx"'
            }
        )
    except Exception as e:
        print(f"Toolkit Generate Packing List Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
"""

with open('main.py', 'a', encoding='utf-8') as f:
    f.write(endpoint_code)
print("Endpoint appended successfully.")
