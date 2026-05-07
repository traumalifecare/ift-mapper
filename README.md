# IFT Crew Mapper Local Server

This app uses Homebase public API calls that cannot be fetched directly from a local `file://` page because of browser CORS restrictions.

## Run the app

1. Open a terminal in `c:\App`
2. Run:

   ```bash
   node server.js
   ```

3. Open the browser at:

   ```text
   http://localhost:3000/index.html
   ```

## What changed

- Added `server.js` to serve `index.html` over HTTP and proxy Homebase API requests.
- Updated `index.html` so Homebase and Zoho Creator calls can route through the local proxy when loaded from `file://` or over HTTP.

## Notes

- The Homebase token is still entered in the app settings.
- The local server will forward Homebase requests and return the API response to your browser.
- If you use the app from `file://`, the proxy includes CORS headers to allow the requests.
