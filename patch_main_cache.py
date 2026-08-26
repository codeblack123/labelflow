import json
import os
import re

with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update get_label_config
old_label_cfg = '''            if res and isinstance(res, list) and len(res) > 0:
            val = res[0].get('value', '{}')
            cfg = json.loads(val) if isinstance(val, str) else val
            return {**LABEL_CONFIG_DEFAULTS, **cfg}
    except Exception as e:'''

new_label_cfg = '''            if res and isinstance(res, list) and len(res) > 0:
            val = res[0].get('value', '{}')
            cfg = json.loads(val) if isinstance(val, str) else val
            merged = {**LABEL_CONFIG_DEFAULTS, **cfg}
            # Cache locally on success
            try:
                with open(LABEL_CONFIG_FILE, 'w', encoding='utf-8') as cache_f:
                    json.dump(merged, cache_f)
            except: pass
            return merged
    except Exception as e:'''
content = content.replace(old_label_cfg, new_label_cfg)

# 2. Update get_menu_settings
old_menu = '''async def get_menu_settings():
    try:
        data = await supabase_fetch("GET", "menu_settings?select=hidden_menus,menu_order&limit=1")
        if data and isinstance(data, list) and len(data) > 0:
            return data[0]
        return {"hidden_menus": [], "menu_order": []}
    except Exception as e:
        print(f"Menu Settings Get Error: {e}")
        return {"hidden_menus": [], "menu_order": []}'''

new_menu = '''async def get_menu_settings():
    cache_file = "menu_settings_cache.json"
    try:
        data = await supabase_fetch("GET", "menu_settings?select=hidden_menus,menu_order&limit=1")
        if data and isinstance(data, list) and len(data) > 0:
            result = data[0]
            try:
                with open(cache_file, 'w', encoding='utf-8') as f: json.dump(result, f)
            except: pass
            return result
    except Exception as e:
        print(f"Menu Settings Get Error: {e}")
    # Fallback to local cache
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f: return json.load(f)
        except: pass
    return {"hidden_menus": [], "menu_order": []}'''
content = content.replace(old_menu, new_menu)

# 3. Update get_toolkit_order
old_tk_order = '''async def get_toolkit_order():
    try:
        res = await supabase_fetch("GET", "app_settings?key=eq.toolkit_order")
        if res and isinstance(res, list) and len(res) > 0:
            val = res[0].get('value', '[]')
            return json.loads(val) if isinstance(val, str) else val
        return []
    except Exception as e:
        print(f"Toolkit Order Get Error: {e}")
        return []'''

new_tk_order = '''async def get_toolkit_order():
    cache_file = "toolkit_order_cache.json"
    try:
        res = await supabase_fetch("GET", "app_settings?key=eq.toolkit_order")
        if res and isinstance(res, list) and len(res) > 0:
            val = res[0].get('value', '[]')
            result = json.loads(val) if isinstance(val, str) else val
            try:
                with open(cache_file, 'w', encoding='utf-8') as f: json.dump(result, f)
            except: pass
            return result
    except Exception as e:
        print(f"Toolkit Order Get Error: {e}")
    # Fallback to local cache
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f: return json.load(f)
        except: pass
    return []'''
content = content.replace(old_tk_order, new_tk_order)

# 4. Update get_toolkit_features
old_tk_feat = '''async def get_toolkit_features():
    try:
        data = await supabase_fetch("GET", "toolkit_feature_locks?select=feature_key,is_locked")
        return data
    except Exception as e:
        print(f"Toolkit Features Get Error: {e}")
        return []'''

new_tk_feat = '''async def get_toolkit_features():
    cache_file = "toolkit_features_cache.json"
    try:
        data = await supabase_fetch("GET", "toolkit_feature_locks?select=feature_key,is_locked")
        try:
            with open(cache_file, 'w', encoding='utf-8') as f: json.dump(data, f)
        except: pass
        return data
    except Exception as e:
        print(f"Toolkit Features Get Error: {e}")
    # Fallback to local cache
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f: return json.load(f)
        except: pass
    return []'''
content = content.replace(old_tk_feat, new_tk_feat)

with open('main.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated main.py")
