"""Patch script to add label_cfg to process_labels and process_labels_with_stats."""

with open('main.py', 'r', encoding='utf-8', newline='') as f:
    content = f.read()

crlf_count = content.count('\r\n')
lf_count   = content.count('\n') - crlf_count
print(f"File line endings: CRLF={crlf_count}, LF-only={lf_count}")

SEP = '\r\n'  # CRLF

# Marker 1: inside process_labels, before def rak_id_sort_key with docstring
OLD1 = (
    f'            except:{SEP}'
    f'                pass{SEP}'
    f'{SEP}'
    f'        def rak_id_sort_key(item):{SEP}'
    f'            """{SEP}'
    f'            Sort berdasarkan Rak'
)
NEW1 = (
    f'            except:{SEP}'
    f'                pass{SEP}'
    f'{SEP}'
    f'        # Fetch label table config (ukuran kolom, font, border){SEP}'
    f'        try:{SEP}'
    f'            label_cfg = await get_label_config(){SEP}'
    f'        except:{SEP}'
    f'            label_cfg = {{}}{SEP}'
    f'{SEP}'
    f'        def rak_id_sort_key(item):{SEP}'
    f'            """{SEP}'
    f'            Sort berdasarkan Rak'
)

# Marker 2: inside process_labels_with_stats, before def rak_id_sort_key WITHOUT docstring
OLD2 = (
    f'            except:{SEP}'
    f'                pass{SEP}'
    f'{SEP}'
    f'        def rak_id_sort_key(item):{SEP}'
    f'            sku_upper = item'
)
NEW2 = (
    f'            except:{SEP}'
    f'                pass{SEP}'
    f'{SEP}'
    f'        # Fetch label table config (ukuran kolom, font, border){SEP}'
    f'        try:{SEP}'
    f'            label_cfg = await get_label_config(){SEP}'
    f'        except:{SEP}'
    f'            label_cfg = {{}}{SEP}'
    f'{SEP}'
    f'        def rak_id_sort_key(item):{SEP}'
    f'            sku_upper = item'
)

# Marker 3: remaining generate_table_data calls without label_cfg
OLD3 = (
    f"                    table_result = generate_table_data(chunk, is_extended, rak_map){SEP}"
    f"                    t = create_table({SEP}"
    f"                        table_result['table_data'],{SEP}"
    f"                        row_heights=table_result['row_heights'],{SEP}"
    f"                        span_cmds=table_result['span_cmds'],{SEP}"
    f"                    )"
)
NEW3 = (
    f"                    table_result = generate_table_data(chunk, is_extended, rak_map, label_cfg){SEP}"
    f"                    t = create_table({SEP}"
    f"                        table_result['table_data'],{SEP}"
    f"                        row_heights=table_result['row_heights'],{SEP}"
    f"                        span_cmds=table_result['span_cmds'],{SEP}"
    f"                        label_cfg=label_cfg,{SEP}"
    f"                    )"
)

c1 = content.count(OLD1)
c2 = content.count(OLD2)
c3 = content.count(OLD3)
print(f"Match OLD1={c1}, OLD2={c2}, OLD3={c3}")

content = content.replace(OLD1, NEW1, 1)
content = content.replace(OLD2, NEW2, 1)
content = content.replace(OLD3, NEW3)

with open('main.py', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("Patch applied successfully.")
