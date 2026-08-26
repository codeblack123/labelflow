with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_except = '''        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": 'attachment; filename="packing_list_toolkit.xlsx"'
            }
        )
    except Exception as e:
        print(f"Toolkit Generate Packing List Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))'''

new_except = '''        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": 'attachment; filename="packing_list_toolkit.xlsx"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Toolkit Generate Packing List Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))'''

content = content.replace(old_except, new_except)

with open('main.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed exception handling in main.py")
