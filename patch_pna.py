"""
Script otomatis untuk menambahkan Private Network Access & CORS ke main.py di PC manapun.
Cukup jalankan: python patch_pna.py
"""
import os
import re

target_file = "main.py"

if not os.path.exists(target_file):
    print(f"Error: {target_file} tidak ditemukan di folder ini!")
    input("Tekan Enter untuk keluar...")
    exit(1)

with open(target_file, "r", encoding="utf-8") as f:
    content = f.read()

# Hapus middleware lama jika ada
content = re.sub(
    r'app\.add_middleware\(\s*CORSMiddleware,\s*allow_origins=.*?allow_headers=\["\*"\][,\s]*\)',
    '',
    content,
    flags=re.DOTALL
)

# Cek apakah sudah ada add_private_network_headers
if "add_private_network_headers" in content:
    print("Private Network Access middleware sudah ada di main.py.")
else:
    # Sisipkan middleware tepat setelah app = FastAPI()
    target_pattern = "app = FastAPI()"
    if target_pattern in content:
        replacement = """app = FastAPI()

# Enable CORS for all origins (termasuk web production https://www.labelflow.my.id)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Private Network Access (PNA) Middleware untuk HTTPS -> 127.0.0.1
@app.middleware("http")
async def add_private_network_headers(request: Request, call_next):
    if request.method == "OPTIONS" and request.headers.get("access-control-request-private-network") == "true":
        response = JSONResponse(content={"status": "ok"})
        response.headers["Access-Control-Allow-Origin"] = request.headers.get("origin", "*")
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response
    
    response = await call_next(request)
    if request.headers.get("access-control-request-private-network") == "true":
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response"""
        content = content.replace(target_pattern, replacement, 1)
        print("Berhasil menyisipkan CORS & Private Network Access middleware!")
    else:
        print("Error: Tidak menemukan baris 'app = FastAPI()' di main.py!")
        input("Tekan Enter untuk keluar...")
        exit(1)

with open(target_file, "w", encoding="utf-8") as f:
    f.write(content)

print("\nSUKSES! File main.py berhasil diperbaiki.")
print("Silakan restart backend (jalankan ulang start.bat).")
