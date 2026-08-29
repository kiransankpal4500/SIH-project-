"""
Official INCOIS RSMC HYCOM NetCDF Data Downloader
Inspects https://www.incois.gov.in/oceanservices/rsmc_download.jsp,
extracts the official RSMC_hycom_*.nc download link, and downloads it into backend/data/netcdf/hycom/
"""

import os
import re
import sys
import requests
import xarray as xr
from urllib.parse import urljoin

INCOIS_RSMC_PAGE = "https://www.incois.gov.in/oceanservices/rsmc_download.jsp"
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "data", "netcdf", "hycom"))

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def find_and_download_hycom():
    print(f"=== Task 1: Inspecting Official INCOIS RSMC Source ===")
    print(f"Source Page: {INCOIS_RSMC_PAGE}")
    
    try:
        r = requests.get(INCOIS_RSMC_PAGE, headers=headers, timeout=15, verify=False)
        r.raise_for_status()
    except Exception as e:
        print(f"ERROR: Failed to access INCOIS RSMC download page: {e}")
        return None

    # Look for links matching RSMC_hycom_*.nc
    matches = re.findall(r'href=["\']([^"\']*RSMC_hycom_[^"\']*\.nc)["\']', r.text, re.IGNORECASE)
    
    if not matches:
        # Broader regex for any hycom *.nc file
        matches = re.findall(r'href=["\']([^"\']*hycom[^"\']*\.nc)["\']', r.text, re.IGNORECASE)

    if not matches:
        print("ERROR: No official HYCOM NetCDF download links found on INCOIS RSMC page.")
        return None

    rel_url = matches[0]
    full_url = urljoin(INCOIS_RSMC_PAGE, rel_url)
    filename = os.path.basename(rel_url)
    
    print(f"\nDiscovered Official INCOIS HYCOM File:")
    print(f"  Filename: {filename}")
    print(f"  Download URL: {full_url}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    target_path = os.path.join(OUTPUT_DIR, filename)

    print(f"\n=== Task 2: Downloading Real File to {target_path} ===")
    
    try:
        with requests.get(full_url, headers=headers, stream=True, timeout=60, verify=False) as resp:
            resp.raise_for_status()
            total_bytes = 0
            with open(target_path, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=65536):
                    if chunk:
                        f.write(chunk)
                        total_bytes += len(chunk)
            print(f"Download Complete! Total Bytes Downloaded: {total_bytes} bytes ({total_bytes / (1024*1024):.2f} MB)")
    except Exception as e:
        print(f"\nERROR: Failed to download official INCOIS HYCOM file from {full_url}: {e}")
        if os.path.exists(target_path):
            os.remove(target_path)
        return None

    # Validate with xarray
    print(f"\n=== Validating NetCDF Dataset via xarray ===")
    try:
        ds = xr.open_dataset(target_path, engine="netcdf4")
        print("SUCCESS: Validated official INCOIS NetCDF dataset!")
        print(f"Dimensions: {dict(ds.sizes)}")
        print(f"Data Variables: {list(ds.data_vars.keys())}")
        print(f"Coordinates: {list(ds.coords.keys())}")
        return target_path
    except Exception as e:
        print(f"ERROR: Downloaded file {target_path} is invalid or corrupted NetCDF: {e}")
        return None

if __name__ == "__main__":
    result = find_and_download_hycom()
    if not result:
        sys.exit(1)
