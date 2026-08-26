import re

def run():
    with open('main.py', encoding='utf-8') as f:
        content = f.read()

    # 1. Fix the bug in /toolkit/orderan-kilat
    content = content.replace("final_df.to_excel(writer, index=False, sheet_name='Packing List')", "df_filtered.to_excel(writer, index=False, sheet_name='Packing List')")
    content = content.replace("for col_num, value in enumerate(final_df.columns.values):", "for col_num, value in enumerate(df_filtered.columns.values):")
    content = content.replace("for row_num in range(len(final_df)):", "for row_num in range(len(df_filtered)):")
    content = content.replace("final_df.iloc[row_num", "df_filtered.iloc[row_num")

    # 2. Extract SKU VIP routes and duplicate for 50k
    # We will just write the new routes explicitly to avoid regex bugs.

    new_routes = """

# --- SKU VIP (>50K) ROUTES ---

@app.get("/settings/sku-vip-50k")
async def get_sku_vip_50k():
    try:
        data = await supabase_fetch("GET", "sku_vip_50k?select=id,sku&order=created_at.desc")
        return data if data else []
    except Exception as e:
        print(f"Error getting SKU VIP 50K: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/settings/sku-vip-50k")
async def add_sku_vip_50k(request: Request):
    try:
        body = await request.json()
        sku = body.get("sku")
        if not sku:
            raise HTTPException(status_code=400, detail="SKU wajib diisi")
            
        data = [{"sku": sku}]
        await supabase_fetch("POST", "sku_vip_50k", data=data, headers={"Prefer": "resolution=ignore-duplicates"})
        return {"success": True}
    except Exception as e:
        print(f"Error adding SKU VIP 50K: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/settings/sku-vip-50k/{sku}")
async def delete_sku_vip_50k(sku: str):
    try:
        await supabase_fetch("DELETE", f"sku_vip_50k?sku=eq.{sku}")
        return {"success": True}
    except Exception as e:
        print(f"Error deleting SKU VIP 50K: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/settings/sku-vip-50k/bulk-delete")
async def bulk_delete_sku_vip_50k(request: Request):
    try:
        body = await request.json()
        ids = body.get("ids", [])
        if not ids:
             raise HTTPException(status_code=400, detail="Tidak ada SKU yang dipilih")
             
        for sku in ids:
             await supabase_fetch("DELETE", f"sku_vip_50k?sku=eq.{sku}")
             
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/settings/sku-vip-50k/export")
async def export_sku_vip_50k(request: Request):
    try:
        body = await request.json()
        ids = body.get("ids", [])
        
        if not ids:
            data = await supabase_fetch("GET", "sku_vip_50k?select=sku&order=created_at.desc")
        else:
            in_clause = ",".join(f"%22{sku}%22" for sku in ids)
            data = await supabase_fetch("GET", f"sku_vip_50k?sku=in.({in_clause})&select=sku")
            
        df = pd.DataFrame(data if data else [])
        if df.empty:
            df = pd.DataFrame(columns=["sku"])
            
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='SKU_VIP_50K')
        
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=Export_SKU_VIP_50K.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/settings/import-sku-vip-50k")
async def import_sku_vip_50k(file: UploadFile = File(...)):
    try:
        content = await file.read()
        df = pd.read_excel(io.BytesIO(content), dtype=str)
        
        if 'MSKU' not in df.columns and 'SKU' not in df.columns:
            raise HTTPException(status_code=400, detail="Kolom 'MSKU' atau 'SKU' tidak ditemukan")
            
        col_sku = 'MSKU' if 'MSKU' in df.columns else 'SKU'
        
        skus = set()
        for _, row in df.iterrows():
            sku = str(row[col_sku]).strip()
            if sku and sku not in ('nan', 'None', '-'):
                skus.add(sku)
                
        if not skus:
             return {"success": True, "count": 0}
             
        to_import = [{"sku": s} for s in skus]
        
        # Batch insert
        chunk_size = 100
        for i in range(0, len(to_import), chunk_size):
            chunk = to_import[i:i + chunk_size]
            await supabase_fetch(
                "POST", "sku_vip_50k",
                data=chunk,
                headers={"Prefer": "resolution=ignore-duplicates"}
            )
            
        return {"success": True, "count": len(skus)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/toolkit/orderan-kilat-50k")
async def process_orderan_kilat_50k(file: UploadFile = File(...)):
    try:
        content = await file.read()
        df = pd.read_excel(io.BytesIO(content), dtype=str, keep_default_na=False)
        
        if len(df) == 0:
            raise HTTPException(status_code=400, detail="File Excel kosong")
            
        col_id_pesanan = next((c for c in df.columns if 'ID PESANAN' in str(c).upper() or 'NO. PESANAN' in str(c).upper() or 'AWB' in str(c).upper()), None)
        col_msku = next((c for c in df.columns if 'MSKU' in str(c).upper()), None)
        
        if not col_id_pesanan or not col_msku:
            raise HTTPException(status_code=400, detail="Kolom 'ID Pesanan' atau 'MSKU' tidak ditemukan")
            
        # Ambil data SKU VIP 50K dari Supabase
        vip_data = await supabase_fetch("GET", "sku_vip_50k?select=sku")
        vip_skus = {e['sku'] for e in vip_data} if vip_data else set()
        
        if not vip_skus:
            raise HTTPException(status_code=404, detail="Data SKU VIP (>50K) masih kosong di database")
            
        import numpy as np
        df_ffill = df.copy()
        df_ffill[col_id_pesanan] = df_ffill[col_id_pesanan].replace('', np.nan)
        df_ffill[col_id_pesanan] = df_ffill[col_id_pesanan].ffill()
        
        vip_order_ids = set()
        for idx, row in df_ffill.iterrows():
            msku = str(row[col_msku]).strip()
            order_id = str(row[col_id_pesanan]).strip()
            if msku in vip_skus:
                vip_order_ids.add(order_id)
                
        if not vip_order_ids:
            raise HTTPException(status_code=404, detail="Tidak ditemukan resi dengan SKU VIP (>50K) di file ini")
            
        df_filtered = df_ffill[df_ffill[col_id_pesanan].isin(vip_order_ids)]
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df_filtered.to_excel(writer, index=False, sheet_name='Packing List')
            
            workbook  = writer.book
            worksheet = writer.sheets['Packing List']
            
            header_format = workbook.add_format({
                'bold': True,
                'bg_color': '#D9D9D9',
                'border': 1,
                'align': 'center',
                'valign': 'vcenter'
            })
            
            cell_format_center = workbook.add_format({
                'align': 'center',
                'valign': 'vcenter',
                'border': 1,
                'text_wrap': True
            })
            
            cell_format_left = workbook.add_format({
                'align': 'left',
                'valign': 'vcenter',
                'border': 1,
                'text_wrap': True
            })
            
            for col_num, value in enumerate(df_filtered.columns.values):
                worksheet.write(0, col_num, value, header_format)
            
            worksheet.set_column('A:A', 15)
            worksheet.set_column('B:B', 40)
            worksheet.set_column('C:C', 10)
            worksheet.set_column('D:D', 30)
            
            for row_num in range(len(df_filtered)):
                worksheet.write(row_num + 1, 0, df_filtered.iloc[row_num, 0], cell_format_center)
                worksheet.write(row_num + 1, 1, df_filtered.iloc[row_num, 1], cell_format_left)
                worksheet.write(row_num + 1, 2, df_filtered.iloc[row_num, 2], cell_format_center)
                worksheet.write(row_num + 1, 3, df_filtered.iloc[row_num, 3], cell_format_left)

        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=Hasil_Orderan_Kilat_50K.xlsx"}
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
"""

    if "@app.get(\"/settings/sku-vip-50k\")" not in content:
        content += new_routes

    with open('main.py', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Successfully patched main.py")

run()
