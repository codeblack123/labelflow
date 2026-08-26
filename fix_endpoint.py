with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of the endpoint we appended
endpoint_marker = '@app.post("/toolkit/generate-packing-list")'
main_block_marker = 'if __name__ == "__main__":'

if endpoint_marker in content and main_block_marker in content:
    # Split the content
    parts = content.split(main_block_marker)
    before_main = parts[0]
    after_main = parts[1]
    
    # We know the endpoint is inside after_main (since we appended it)
    if endpoint_marker in after_main:
        # Extract the endpoint code
        endpoint_code = after_main[after_main.find(endpoint_marker):]
        
        # Remove the endpoint code from after_main
        after_main = after_main[:after_main.find(endpoint_marker)]
        
        # Construct the new content
        new_content = before_main + '\n\n' + endpoint_code + '\n\n' + main_block_marker + after_main
        
        with open('main.py', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Fixed endpoint placement")
    else:
        print("Endpoint not found after main block")
else:
    print("Markers not found")
