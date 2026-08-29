import os
import sys
import hashlib
import datetime
import netCDF4 as nc
import xarray as xr
import pandas as pd

fpath = r"c:\Users\user\Desktop\SIH\SIH-project-\OceanScope\backend\data\netcdf\hycom\RSMC_hycom_20260829.nc"
fsize = os.path.getsize(fpath)
ctime = datetime.datetime.fromtimestamp(os.path.getctime(fpath))
mtime = datetime.datetime.fromtimestamp(os.path.getmtime(fpath))

sha256 = hashlib.sha256()
with open(fpath, "rb") as f:
    while chunk := f.read(8192 * 1024):
        sha256.update(chunk)
file_hash = sha256.hexdigest()

print("=== 1-7: File Metadata ===")
print(f"1. Absolute Path: {fpath}")
print(f"2. Filename: {os.path.basename(fpath)}")
print(f"3. File Size: {fsize:,} bytes ({fsize / (1024*1024):.2f} MB)")
print(f"4. Creation Timestamp: {ctime} | Modified Timestamp: {mtime}")
print(f"7. SHA-256: {file_hash}")

print("\n=== 8: NetCDF Global Attributes & Variable Metadata ===")
with nc.Dataset(fpath, "r") as ds:
    for attr in ds.ncattrs():
        print(f"   - Global attr \"{attr}\": {getattr(ds, attr)}")
    print(f"   - Dimensions: {list(ds.dimensions.keys())}")
    print("   - Key Variable Metadata:")
    for v in ["TEMP", "SALN", "UVEL", "VVEL", "SSH", "TCHP", "MLD", "TIME", "DEPTH", "LAT", "LON"]:
        if v in ds.variables:
            var = ds.variables[v]
            attrs = {a: getattr(var, a) for a in var.ncattrs()}
            print(f"     * {v} (shape={var.shape}, dtype={var.dtype}): {attrs}")

print("\n=== 9-12: Data Values via HYCOM Service ===")
sys.path.insert(0, r"c:\Users\user\Desktop\SIH\SIH-project-\OceanScope\backend")
from app.services.hycom_service import hycom_service
from app.services.hycom_dataset_manager import hycom_dataset_manager

meta = hycom_service.get_metadata()
print(f"Active File: {meta.filename}")
print(f"Available Files: {meta.available_files}")
print(f"Discovered Variables ({len(meta.discovered_variables)}): {meta.discovered_variables}")
print(f"Mapped Variables: {meta.mapped_variables}")
print(f"9. Actual Model Timestamps: {meta.time_range}")

t_req = meta.time_range[0]
pt_temp = hycom_service.get_point(latitude=15.0, longitude=85.0, depth=0.0, variable="temperature", time_str=t_req)
pt_sal = hycom_service.get_point(latitude=15.0, longitude=85.0, depth=0.0, variable="salinity", time_str=t_req)
pt_curr = hycom_service.get_current(latitude=15.0, longitude=85.0, depth=0.0, time_str=t_req)

print(f"10. Temperature at (15.0N, 85.0E, 0m, {t_req}): {pt_temp.value:.4f} {pt_temp.unit} (grid lat={pt_temp.latitude:.3f}N, lon={pt_temp.longitude:.3f}E, file={pt_temp.selected_file})")
print(f"11. Salinity at (15.0N, 85.0E, 0m, {t_req}): {pt_sal.value:.4f} {pt_sal.unit} (grid lat={pt_sal.latitude:.3f}N, lon={pt_sal.longitude:.3f}E, file={pt_sal.selected_file})")
print(f"12. Current Vector at (15.0N, 85.0E, 0m, {t_req}): u={pt_curr.u:.4f} {pt_curr.unit}, v={pt_curr.v:.4f} {pt_curr.unit}, Speed={pt_curr.speed:.4f} {pt_curr.unit}, Dir={pt_curr.direction:.2f} deg (file={pt_curr.selected_file})")

# Check if synthetic file exists or is accessed
synth_path = r"c:\Users\user\Desktop\SIH\SIH-project-\OceanScope\backend\data\netcdf\hycom\incois_hycom_daily_latest.nc"
print(f"\nSynthetic file check '{synth_path}': Exists = {os.path.exists(synth_path)}")
print(f"Active Files in Manager: {[os.path.basename(f) for f in hycom_dataset_manager.discover_files()]}")
