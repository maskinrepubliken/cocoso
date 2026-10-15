// MapLibre GL JS (BSD-3-Clause), loaded from jsDelivr the first time a map
// is shown, so pages without a map do not carry its megabyte.
//
// It is not an npm dependency because node_modules on the dev server cannot
// be written to from the sessions that edit the code. Version 5 is used
// because version 6 starts its worker from a separate file, which a browser
// refuses to load from another origin. The integrity hashes pin the exact
// files; change all three together. To bundle it instead: npm install
// maplibre-gl@5 and replace this module with `import('maplibre-gl')`.
const VERSION = '5.24.0';
const BASE = `https://cdn.jsdelivr.net/npm/maplibre-gl@${VERSION}/dist`;
const JS_INTEGRITY =
  'sha384-5+cfbwT0iiub6VsQAdn6yz16nr6sDiQoHx6tm4O8OVYXHYOxcffFmCJBL0dgdvGp';
const CSS_INTEGRITY =
  'sha384-uTttxo/aOKbdE5RlD/SPzSDoDmNvGlUYPjONi2MN/b7c9HPSvW07OIuyP7uL6jxK';

// The map style: OpenFreeMap's vector tiles of OpenStreetMap data. Free, no
// key, no cookies; attribution is added by MapLibre itself.
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

let loading: Promise<any> | null = null;

export default function loadMaplibre(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('maplibre-gl is browser only'));
  }
  if ((window as any).maplibregl) {
    return Promise.resolve((window as any).maplibregl);
  }
  if (loading) {
    return loading;
  }
  loading = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${BASE}/maplibre-gl.css`;
    css.integrity = CSS_INTEGRITY;
    css.crossOrigin = 'anonymous';
    document.head.appendChild(css);

    const script = document.createElement('script');
    script.src = `${BASE}/maplibre-gl.js`;
    script.integrity = JS_INTEGRITY;
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () => resolve((window as any).maplibregl);
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error('Could not load maplibre-gl'));
    };
    document.head.appendChild(script);
  });
  return loading;
}
