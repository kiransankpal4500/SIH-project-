import requests
import re
from urllib.parse import urljoin

url = 'https://www.incois.gov.in/oceanservices/rsmc_download.jsp'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

print(f"Fetching {url} ...")
r = requests.get(url, headers=headers, timeout=15, verify=False)
print("Status Code:", r.status_code)
print("Length of HTML:", len(r.text))

# Search for all URLs, JS scripts, .nc files, and download links
links = re.findall(r'href=["\'](.*?)["\']', r.text, re.IGNORECASE)
srcs = re.findall(r'src=["\'](.*?)["\']', r.text, re.IGNORECASE)
all_links = [urljoin(url, l) for l in set(links + srcs)]

print("\n--- FOUND LINKS & SCRIPTS ---")
for l in sorted(all_links):
    print("  ", l)

# Look for inline JavaScript files or APIs loaded in the page
print("\n--- INLINE JS SCRIPT SEGMENTS ---")
for line in r.text.splitlines():
    if any(k in line.lower() for k in ['hycom', 'nc', 'download', 'dataset', 'file', 'thredds', 'api', 'data', 'servlet', 'php', 'jsp']):
        if len(line.strip()) < 300:
            print("  ", line.strip())
