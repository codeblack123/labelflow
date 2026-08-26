import re

def run():
    with open('main.py', encoding='utf-8') as f:
        content = f.read()

    matches = re.findall(r'@[^\n]+vip[^\n]+', content, flags=re.IGNORECASE)
    with open('temp_grep.txt', 'w', encoding='utf-8') as out:
        out.write('\n'.join(matches))

run()
