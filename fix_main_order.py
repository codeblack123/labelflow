def fix_main():
    with open('main.py', encoding='utf-8') as f:
        content = f.read()

    marker = '# --- SKU VIP (>50K) ROUTES ---'
    if marker in content:
        # Split at marker
        parts = content.split(marker)
        before_marker = parts[0]
        vip_routes = marker + parts[1]

        # The vip routes shouldn't have been at the end if it's after __main__
        # Let's find __main__ in before_marker
        main_marker = 'if __name__ == "__main__":'
        
        if main_marker in before_marker:
            before_main, main_block = before_marker.split(main_marker)
            # Reconstruct correctly: before_main + vip_routes + main_marker + main_block
            new_content = before_main + '\n\n' + vip_routes + '\n\n' + main_marker + main_block
            with open('main.py', 'w', encoding='utf-8') as f:
                f.write(new_content)
            print("Fixed main.py order.")
        else:
            print("main_marker not found, no fix needed or different issue.")
    else:
        print("marker not found.")

fix_main()
