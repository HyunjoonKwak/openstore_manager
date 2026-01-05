import json

path = '/var/folders/3m/qvp11b5s24xdf1z66_59l6v80000gn/T//commerce-api/docs/2.0.0-RC.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read().strip()

# Find the first { and the last }
start = content.find('{')
end = content.rfind('}')

if start != -1 and end != -1:
    json_str = content[start:end+1]
    try:
        apidoc = json.loads(json_str)
        print("Successfully loaded JSON")
        
        components = apidoc.get('components', {}).get('schemas', {})
        
        # Define targets and search
        targets = {
            'productInfoProvide': ['productInfoProvide', 'ProductInfoProvide'],
            'certification': ['certification', 'Certification'],
            'delivery': ['delivery', 'Delivery'],
            'option': ['option', 'Option'],
            'seo': ['seo', 'SEO'],
            'discount': ['discount', 'Point', 'discount', 'point']
        }
        
        # Find schemas that match these names
        results = {}
        for key, patterns in targets.items():
            results[key] = []
            for name in components:
                if any(p in name for p in patterns):
                    results[key].append(name)
        
        # Specifically look for originProductNo related PUT request
        paths = apidoc.get('paths', {})
        put_schema_name = None
        for path_name, path_item in paths.items():
            if 'originProductNo' in path_name and 'put' in path_item:
                put_op = path_item['put']
                ref = put_op.get('requestBody', {}).get('content', {}).get('application/json', {}).get('schema', {}).get('$ref')
                if ref:
                    put_schema_name = ref.split('/')[-1]
                    print(f"Found PUT schema: {put_schema_name}")

        if put_schema_name:
            root_schema = components.get(put_schema_name, {})
            props = root_schema.get('properties', {})
            print("\n--- Properties in " + put_schema_name + " ---")
            for p in props:
                print(f"- {p}")

        # Now output the requested ones
        sections = {
            'productInfoProvide': 'productInfoProvide',
            'certification': 'certification',
            'delivery': 'delivery',
            'option': 'option',
            'seo': 'seo',
            'discount': 'discount',
            'point': 'point'
        }
        
        for section_name, prop_name in sections.items():
            print(f"\n==================== {section_name.upper()} ====================")
            # Find in root properties first
            if put_schema_name and prop_name in components.get(put_schema_name, {}).get('properties', {}):
                prop_val = components[put_schema_name]['properties'][prop_name]
                print(json.dumps(prop_val, indent=2, ensure_ascii=False))
                if '$ref' in prop_val:
                    ref_name = prop_val['$ref'].split('/')[-1]
                    print(f"\n--- Referenced Schema: {ref_name} ---")
                    print(json.dumps(components.get(ref_name, {}), indent=2, ensure_ascii=False))
            else:
                # Look for schemas that might be it
                matches = [n for n in components if prop_name.lower() in n.lower()]
                if matches:
                    print(f"Possible schemas: {matches}")
                    for m in matches[:2]: # Show first 2
                        print(f"\n--- Schema: {m} ---")
                        print(json.dumps(components[m], indent=2, ensure_ascii=False))

    except Exception as e:
        print(f"Error: {e}")
        # Print a chunk of the string around where it failed
        # import traceback
        # traceback.print_exc()
else:
    print("Could not find start or end")

