# Yupoo → Media Library (public albums)

Personal/reference scrape of **public** Yupoo collection/album pages into Shop Admin Media Library.

## Public links used
- `https://paypalshop.x.yupoo.com/collections/2865378`
- `https://soccerjerseys20232024.x.yupoo.com/albums/133050075` *(returned 404 when last checked)*

## Run
```bash
cd LITTLUXURY
python3 -m pip install requests beautifulsoup4
python3 scripts/scrape_yupoo_public.py \
  --url "https://paypalshop.x.yupoo.com/collections/2865378"
```

Optional:
```bash
python3 scripts/scrape_yupoo_public.py --url "…" --limit 40 --max-pages 5
```

## Output
- Images: `littluxry-app/public/assets/imports/<slug>/`
- Manifest: `littluxry-app/src/data/yupooImports.json` (loaded by Media Library)
- Binaries are **gitignored**; `scripts/deploy-vps.sh` rsyncs them to the VPS

## Shop Admin
https://litt-luxury.com/dashboard/media → filter **Yupoo imports**
