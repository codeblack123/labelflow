import urllib.request, json, io, pandas as pd

# 1. Fetch sample sku from 20k
with urllib.request.urlopen('http://127.0.0.1:8001/settings/sku-vip-20k') as resp:
    data = json.loads(resp.read().decode())
    vip_sku = data[0]['sku']
    print(f"Total 20K in DB: {len(data)}, sample SKU: {vip_sku}")

# 2. Build test excel
df = pd.DataFrame([
    {'ID PESANAN': 'ORDER-VIP-001', 'MSKU': vip_sku, 'JUMLAH': 1, 'NAMA BARANG': 'Produk VIP 20K'},
    {'ID PESANAN': 'ORDER-REG-002', 'MSKU': 'NON-VIP-999', 'JUMLAH': 2, 'NAMA BARANG': 'Produk Regular'}
])
buf = io.BytesIO()
df.to_excel(buf, index=False)
excel_bytes = buf.getvalue()

# 3. Multipart upload test
boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = bytearray()
body.extend(f'--{boundary}\r\n'.encode('utf-8'))
body.extend(b'Content-Disposition: form-data; name="file"; filename="ginee_test.xlsx"\r\n')
body.extend(b'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n')
body.extend(excel_bytes)
body.extend(f'\r\n--{boundary}--\r\n'.encode('utf-8'))

for tier in ['10k', '20k']:
    # also fetch sample for tier
    with urllib.request.urlopen(f'http://127.0.0.1:8001/settings/sku-vip-{tier}') as r:
        tier_sku = json.loads(r.read().decode())[0]['sku']
    
    tier_df = pd.DataFrame([
        {'ID PESANAN': f'ORDER-{tier.upper()}-001', 'MSKU': tier_sku, 'JUMLAH': 1, 'NAMA BARANG': f'Produk {tier}'},
        {'ID PESANAN': 'ORDER-REG-002', 'MSKU': 'NON-VIP-999', 'JUMLAH': 2, 'NAMA BARANG': 'Produk Regular'}
    ])
    t_buf = io.BytesIO()
    tier_df.to_excel(t_buf, index=False)
    
    t_body = bytearray()
    t_body.extend(f'--{boundary}\r\n'.encode('utf-8'))
    t_body.extend(b'Content-Disposition: form-data; name="file"; filename="ginee_test.xlsx"\r\n')
    t_body.extend(b'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n')
    t_body.extend(t_buf.getvalue())
    t_body.extend(f'\r\n--{boundary}--\r\n'.encode('utf-8'))
    
    req = urllib.request.Request(
        f'http://127.0.0.1:8001/toolkit/orderan-kilat-{tier}',
        data=bytes(t_body),
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read()
            out_df = pd.read_excel(io.BytesIO(content))
            print(f"[SUCCESS] {tier.upper()} Filter: Returned {len(out_df)} rows: {out_df['ID PESANAN'].tolist()}")
    except Exception as e:
        print(f"[ERROR] {tier.upper()} Filter: {e}")
