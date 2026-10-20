import re

file_path = r'c:\Users\jgilb\OneDrive\Dokumen\bolt new\2_gudang lantai 5\devmode\gudang 5 scan sub rak\src\components\DatabaseLog.tsx'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Search for functions related to auto-fix, redistribute, cek saldo, etc.
fn_matches = re.findall(r'(const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)', text)
print(f"Found {len(fn_matches)} arrow functions")

interesting = []
for full, name in fn_matches:
    if any(k in name.lower() for k in ['fix', 'auto', 'redistribut', 'remediat', 'saldo', 'cek', 'batch', 'sync', 'adjust']):
        interesting.append(name)

print("Interesting functions:")
for fn in set(interesting):
    print(" ", fn)
