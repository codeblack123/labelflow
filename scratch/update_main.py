import re
import urllib.parse

with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Endpoints
endpoints_code = """
class LabelPriorityItem(BaseModel):
    format_type: str
    keyword: str

@app.get("/settings/label-priority-bottom")
async def get_label_priority_bottom(format_type: str = None):
    try:
        url = "label_bottom_priorities"
        if format_type:
            url += f"?format_type=eq.{format_type}"
        data = await supabase_fetch("GET", url)
        return data
    except Exception as e:
        print(f"Error GET label priority: {e}")
        return []

@app.post("/settings/label-priority-bottom")
async def add_label_priority_bottom(item: LabelPriorityItem):
    import urllib.parse
    try:
        data = {"format_type": item.format_type, "keyword": item.keyword}
        existing = await supabase_fetch("GET", f"label_bottom_priorities?format_type=eq.{item.format_type}&keyword=eq.{urllib.parse.quote(item.keyword)}")
        if not existing:
            await supabase_fetch("POST", "label_bottom_priorities", data=data)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/settings/label-priority-bottom/{id}")
async def delete_label_priority_bottom(id: str):
    try:
        await supabase_fetch("DELETE", f"label_bottom_priorities?id=eq.{id}")
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
"""

# Insert endpoints right before process_labels
patt_process_labels = r'(@app\.post\("/process-labels"\))'
content = re.sub(patt_process_labels, endpoints_code + r'\n\1', content, count=1)

# 2. In process_labels and process_labels_with_stats: Fetch bottom priorities
fetch_code = """
        try:
            bottom_priorities_res = await supabase_fetch("GET", "label_bottom_priorities")
            bottom_priorities_std = [item['keyword'].strip().upper() for item in bottom_priorities_res if item['format_type'] == 'standar']
            bottom_priorities_rak = [item['keyword'].strip().upper() for item in bottom_priorities_res if item['format_type'] == 'rak_id']
        except:
            bottom_priorities_std = []
            bottom_priorities_rak = []
"""

# Process Labels
patt_label_cfg = r'(        # Fetch label table config.*?        except:\n            label_cfg = \{\}\n)'
content = re.sub(patt_label_cfg, r'\1' + fetch_code, content, count=2, flags=re.DOTALL)

# 3. Add logic to extract bottom items
bottom_logic = """
            # Pisahkan data bottom priority
            if is_extended:
                normal_items = []
                bottom_items = []
                for item in awb_to_items[awb]:
                    sku_up = item['msku'].strip().upper()
                    r_info = rak_map.get(sku_up, {})
                    c = ""
                    if r_info.get('id') and r_info.get('rak') and not str(r_info.get('id')).upper().startswith(str(r_info.get('rak')).upper()):
                        c = f"{r_info.get('rak')}-{r_info.get('id')}".strip().upper()
                    else:
                        c = str(r_info.get('id') or r_info.get('rak') or "").strip().upper()
                    
                    is_bottom = any(c == k or c.startswith(k) for k in bottom_priorities_rak)
                    if is_bottom:
                        bottom_items.append(item)
                    else:
                        normal_items.append(item)
                awb_to_items[awb] = normal_items + bottom_items
            else:
                normal_items = []
                bottom_items = []
                for item in awb_to_items[awb]:
                    sku_up = item['msku'].strip().upper()
                    is_bottom = any(sku_up == k or sku_up.startswith(k) for k in bottom_priorities_std)
                    if is_bottom:
                        bottom_items.append(item)
                    else:
                        normal_items.append(item)
                awb_to_items[awb] = normal_items + bottom_items
"""

patt_sort_loop = r'(        for awb in awb_to_items:\n.*?            else:\n                awb_to_items\[awb\]\.sort\(key=lambda x: x\[\'msku\'\]\)\n)'
content = re.sub(patt_sort_loop, r'\1' + bottom_logic, content, count=2, flags=re.DOTALL)

with open('main.py', 'w', encoding='utf-8') as f:
    f.write(content)
