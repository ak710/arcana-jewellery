// script.js — device viewer
// - Loads a 3D model (GLB) for the scanned item, applies simple PBR materials,
//   and animates a subtle scene (particles + slow rotation).
// - Looks up optional item metadata from a local `items.json` manifest or
//   from a Supabase `items` REST endpoint when `USE_SUPABASE` is enabled.
// Configuration below controls model loading and Supabase lookups.
const ENABLE_CUSTOM_MODEL = true;
// The `ITEM_ID` is still read from the URL (device.html?item=1234).
const urlParamsForModel = new URLSearchParams(window.location.search);
const ITEM_ID = urlParamsForModel.get('item');
// Do not assume any local or hardcoded model file — model URL comes from Supabase.
let CUSTOM_MODEL_URL = '';

// Supabase integration toggle. When true, the script will try to fetch
// item metadata from a Supabase table `items` using the REST API.
// Configure these values before enabling in production.
const USE_SUPABASE = true; // set to true to enable Supabase lookups
const SUPABASE_URL = 'https://gktehkfaiqutjrunfyah.supabase.co' // e.g. 'https://xyzcompany.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_vDVciGc-1-vg0HXe3MmHAg_V6Ea90hQ' // project anon key (public)

// Initialize icons (Lucide) used in the UI
lucide.createIcons();

// --- THREE.JS BACKGROUND SETUP ---
const scene = new THREE.Scene();
// Add subtle fog for depth (light theme)
scene.fog = new THREE.FogExp2(0xFFFFFF, 0.01);

// Shared references for the loaded jewel and fallback object. Declared
// at module scope so the animation loop can reference them safely before load.
let jewel = null;
let fallbackJewel = null;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// --- VIEW CONFIG ---
// If true, camera will be placed on the +Y axis looking down at the model (top-down)
// This also switches zoom/position logic to use Y instead of Z so existing
// transitions/animations continue to work.
const USE_TOP_DOWN_VIEW = true;

// Helper accessor for camera distance so code can be axis-agnostic
function getCameraDistance() {
    return USE_TOP_DOWN_VIEW ? camera.position.y : camera.position.z;
}

function setCameraDistance(v) {
    if (USE_TOP_DOWN_VIEW) {
        camera.position.set(0, v, 0);
    } else {
        camera.position.set(0, 0, v);
    }
}

// Initialize camera position
setCameraDistance(35);
// Make the camera look at origin so top-down mode faces the model
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0xFFFFFF, 0); // White background with transparency
document.getElementById('canvas-container').appendChild(renderer.domElement);
// Use sRGB output and filmic tone mapping for more accurate colors
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
// --- CUSTOM MODEL LOADING (OPTIONAL) ---
// ITEM_DATA will be populated from Supabase only.
let ITEM_DATA = null;

async function fetchIframeUrl(modelUrl) {
    if (!USE_SUPABASE || !modelUrl || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return null;
    }
    try {
        const url = `${SUPABASE_URL}/rest/v1/model_iframes?model_url=eq.${encodeURIComponent(modelUrl)}&select=iframe_url`;
        console.debug('fetchIframeUrl -> requesting', url);
        const resp = await fetch(url, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!resp) {
            console.warn('fetchIframeUrl -> no response object');
            return null;
        }

        // Log status for debugging (CORS/RLS/401/403 will show here)
        console.debug('fetchIframeUrl -> status', resp.status, resp.statusText);

        if (resp.ok) {
            const rows = await resp.json();
            console.debug('fetchIframeUrl -> rows', rows);
            if (Array.isArray(rows) && rows.length > 0) {
                return rows[0].iframe_url || null;
            }
            return null;
        } else {
            // Attempt to surface response body for debugging (may be JSON or text)
            try {
                const text = await resp.text();
                console.warn('fetchIframeUrl -> non-ok response body:', text);
            } catch (e) {
                console.warn('fetchIframeUrl -> non-ok response and body read failed', e);
            }
            return null;
        }
    } catch (e) {
        console.warn('Failed to fetch iframe URL', e);
    }
    return null;
}


async function loadAndInitModel() {
    // Only use Supabase as the source of truth for item metadata.
    if (USE_SUPABASE && ITEM_ID && SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
            // Supabase REST select: /rest/v1/items?id=eq.<ITEM_ID>
            const url = `${SUPABASE_URL}/rest/v1/items?id=eq.${encodeURIComponent(ITEM_ID)}&select=*`;
            const resp = await fetch(url, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
                    if (resp && resp.ok) {
                        const rows = await resp.json();
                        if (Array.isArray(rows) && rows.length > 0) {
                            // Map the first row into ITEM_DATA and normalize common field names.
                            ITEM_DATA = rows[0];
                            if (ITEM_DATA.model_url) CUSTOM_MODEL_URL = ITEM_DATA.model_url;
                            else if (ITEM_DATA.model) CUSTOM_MODEL_URL = ITEM_DATA.model;

                        // If the items row contains an explicit iframe_url, use it.
                        // Otherwise, the code will optionally map model_url -> iframe via
                        // the `model_iframes` lookup in fetchIframeUrl().
                        try {
                            const device3dIframe = document.getElementById('device-3d-iframe');
                            if (ITEM_DATA.iframe_url && device3dIframe) {
                                device3dIframe.src = ITEM_DATA.iframe_url;
                            } else if (CUSTOM_MODEL_URL) {
                                // Fallback mapping: try to fetch iframe mapping for the model_url
                                try {
                                    const iframeUrl = await fetchIframeUrl(CUSTOM_MODEL_URL);
                                    if (iframeUrl && device3dIframe) device3dIframe.src = iframeUrl;
                                } catch (e) { console.warn('fetchIframeUrl failed', e); }
                            }
                        } catch (e) { console.warn('setting device iframe failed', e); }

                            // Populate visible placeholders (sender, title, video, message)
                            try {
                                const elFrom = document.getElementById('message-from');
                                const elSign = document.getElementById('message-sign');
                                const elItem = document.getElementById('item-id-label');
                                const vidIframe = document.getElementById('embedded-iframe');
                                const msgBody = document.getElementById('message-body');
                                const msgTitle = document.getElementById('message-title');
                                const voiceCard = document.getElementById('voice-card');
                                const voiceAudio = document.getElementById('voice-audio');
                                const songCard = document.getElementById('song-card');
                                const songEmbed = document.getElementById('song-embed');
                                const songFallback = document.getElementById('song-fallback');
                                const songLink = document.getElementById('song-link');
                                const locationCard = document.getElementById('location-card');
                                const locationLabel = document.getElementById('location-label');
                                const locationLink = document.getElementById('location-link');
                                const locationEmbed = document.getElementById('location-embed');
                                const locationEmbedWrap = document.getElementById('location-embed-wrap');

                                const sender = ITEM_DATA.sender || ITEM_DATA.from || ITEM_DATA.created_by || null;
                                // Allow an explicit signature field to override the sender display
                                const signature = ITEM_DATA.signature || ITEM_DATA.sign || null;
                                const video = ITEM_DATA.video_url || ITEM_DATA.video || ITEM_DATA.videoUrl || null;
                                const voice = ITEM_DATA.voice_url || ITEM_DATA.voice || ITEM_DATA.voiceNote || null;
                                const song = ITEM_DATA.song_embed || ITEM_DATA.song_url || ITEM_DATA.song || ITEM_DATA.playlist || null;
                                const locationLabelVal = ITEM_DATA.location_label || ITEM_DATA.location || ITEM_DATA.place || null;
                                const locationLat = ITEM_DATA.location_lat || ITEM_DATA.lat || null;
                                const locationLng = ITEM_DATA.location_lng || ITEM_DATA.lng || null;
                                const locationUrl = ITEM_DATA.location_url || null;
                                const message = ITEM_DATA.message || ITEM_DATA.text || ITEM_DATA.msg || null;
                                const title = ITEM_DATA.title || ITEM_DATA.heading || null;

                                if (elSign) {
                                    if (signature) elSign.innerText = signature;
                                    else if (sender) elSign.innerText = `From ${sender}`;
                                }
                                if (elItem) elItem.innerText = `#${ITEM_ID}`;

                                if (vidIframe && video) {
                                    // Transform common YouTube watch URLs into embed URLs when necessary.
                                    let src = video;
                                    try {
                                        const u = new URL(video);
                                        if (u.hostname.includes('youtube') && u.searchParams.get('v')) {
                                            src = `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
                                        }
                                    } catch (e) { /* ignore invalid URLs */ }
                                    vidIframe.src = src;
                                }

                                if (msgBody && message) msgBody.innerText = message;
                                if (msgTitle && title) msgTitle.innerText = title;

                                // Voice note
                                if (voiceAudio && voiceCard) {
                                    if (voice) {
                                        voiceAudio.src = voice;
                                        voiceCard.classList.remove('hidden');
                                    } else {
                                        voiceCard.classList.add('hidden');
                                    }
                                }

                                // Song integration (convert Spotify URLs to embeds automatically)
                                if (songCard) {
                                    if (song) {
                                        let embedUrl = song;
                                        let isEmbed = false;
                                        
                                        // Convert Spotify URLs to embed format
                                        try {
                                            const songUrl = new URL(song);
                                            if (songUrl.hostname.includes('spotify.com') || songUrl.hostname.includes('open.spotify.com')) {
                                                // Check if it's already an embed URL
                                                if (song.includes('/embed/')) {
                                                    isEmbed = true;
                                                    embedUrl = song;
                                                } else {
                                                    // Convert regular Spotify URL to embed
                                                    // Format: https://open.spotify.com/track/ID or /playlist/ID or /album/ID
                                                    const pathParts = songUrl.pathname.split('/').filter(p => p);
                                                    if (pathParts.length >= 2) {
                                                        const type = pathParts[0]; // track, playlist, album, etc.
                                                        const id = pathParts[1].split('?')[0]; // Remove query params
                                                        embedUrl = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
                                                        isEmbed = true;
                                                    }
                                                }
                                            } else if (song.includes('embed')) {
                                                // Other embed URLs (YouTube, etc.)
                                                isEmbed = true;
                                            }
                                        } catch (e) {
                                            // If URL parsing fails, check if it contains 'embed' keyword
                                            isEmbed = song.includes('embed');
                                        }
                                        
                                        if (songEmbed) {
                                            songEmbed.src = embedUrl;
                                            songEmbed.style.display = isEmbed ? 'block' : 'none';
                                        }
                                        if (songFallback && songLink) {
                                            songFallback.style.display = isEmbed ? 'none' : 'block';
                                            songLink.href = song; // Keep original URL for fallback link
                                        }
                                        songCard.classList.remove('hidden');
                                    } else {
                                        songCard.classList.add('hidden');
                                    }
                                }

                                // Location pin
                                if (locationCard && locationLabel && locationLink) {
                                    const locHref = locationUrl || (locationLat && locationLng ? `https://maps.google.com/?q=${locationLat},${locationLng}` : null);
                                    const label = locationLabelVal || (locationLat && locationLng ? `${locationLat}, ${locationLng}` : null);

                                    // Build embed URL when possible
                                    const locEmbed = (locationUrl && locationUrl.includes('embed'))
                                        ? locationUrl
                                        : (locationLat && locationLng ? `https://www.google.com/maps?q=${locationLat},${locationLng}&output=embed` : null);

                                    if (locHref && label) {
                                        locationLabel.innerText = label;
                                        locationLink.href = locHref;
                                        locationCard.classList.remove('hidden');

                                        if (locationEmbed && locationEmbedWrap && locEmbed) {
                                            locationEmbed.src = locEmbed;
                                            locationEmbedWrap.classList.remove('hidden');
                                        } else if (locationEmbedWrap) {
                                            locationEmbedWrap.classList.add('hidden');
                                        }
                                    } else {
                                        locationCard.classList.add('hidden');
                                    }
                                }

                                // Populate details screen elements
                                const detailsItemLabel = document.getElementById('details-item-label');
                                const stoneSize = document.getElementById('stone-size');
                                const stoneQuality = document.getElementById('stone-quality');
                                const metalType = document.getElementById('metal-type');
                                const metalPurity = document.getElementById('metal-purity');
                                const certProvider = document.getElementById('cert-provider');
                                const certLink = document.getElementById('cert-link');

                                if (detailsItemLabel) detailsItemLabel.innerText = `Authenticated Item #${ITEM_ID}`;

                                // First check if details are in ITEM_DATA itself
                                let stoneSizeVal = ITEM_DATA.stone_size || ITEM_DATA.stoneSize || null;
                                let stoneQualityVal = ITEM_DATA.stone_quality || ITEM_DATA.stoneQuality || null;
                                let metalTypeVal = ITEM_DATA.metal_type || ITEM_DATA.metalType || null;
                                let metalPurityVal = ITEM_DATA.metal_purity || ITEM_DATA.metalPurity || null;
                                let certificationVal = ITEM_DATA.certification_url || ITEM_DATA.certificationUrl || null;

                                // If not found in item and we have a model_url, fetch from model_iframes table
                                if ((!stoneSizeVal || !stoneQualityVal) && CUSTOM_MODEL_URL) {
                                    try {
                                        const modelUrl = `${SUPABASE_URL}/rest/v1/model_iframes?model_url=eq.${encodeURIComponent(CUSTOM_MODEL_URL)}&select=*`;
                                        const modelResp = await fetch(modelUrl, {
                                            headers: {
                                                'apikey': SUPABASE_ANON_KEY,
                                                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                                                'Content-Type': 'application/json'
                                            }
                                        });
                                        if (modelResp && modelResp.ok) {
                                            const modelRows = await modelResp.json();
                                            if (Array.isArray(modelRows) && modelRows.length > 0) {
                                                const modelData = modelRows[0];
                                                stoneSizeVal = stoneSizeVal || modelData.stone_size || null;
                                                stoneQualityVal = stoneQualityVal || modelData.stone_quality || null;
                                                metalTypeVal = metalTypeVal || modelData.metal_type || null;
                                                metalPurityVal = metalPurityVal || modelData.metal_purity || null;
                                                certificationVal = certificationVal || modelData.certification_url || null;
                                                console.debug('Fetched model_iframes details', modelData);
                                            }
                                        }
                                    } catch (e) { console.warn('Fetching model_iframes details failed', e); }
                                }

                                if (stoneSize) stoneSize.innerText = stoneSizeVal || '—';
                                if (stoneQuality) stoneQuality.innerText = stoneQualityVal || '—';
                                if (metalType) metalType.innerText = metalTypeVal || '—';
                                if (metalPurity) metalPurity.innerText = metalPurityVal || '—';

                                // Handle certification link
                                if (certificationVal && certLink) {
                                    certLink.href = certificationVal;
                                    certLink.classList.remove('hidden');
                                    
                                    // Try to extract provider from URL
                                    let provider = 'View Certificate';
                                    try {
                                        const certUrl = new URL(certificationVal);
                                        if (certUrl.hostname.includes('igi')) provider = 'IGI';
                                        else if (certUrl.hostname.includes('gia')) provider = 'GIA';
                                        else if (certUrl.hostname.includes('hrd')) provider = 'HRD';
                                        else if (certUrl.hostname.includes('ags')) provider = 'AGS';
                                    } catch (e) { /* ignore invalid URLs */ }
                                    if (certProvider) certProvider.innerText = provider;
                                } else {
                                    if (certLink) certLink.classList.add('hidden');
                                    if (certProvider) certProvider.innerText = 'Not Available';
                                }
                            } catch (e) {
                                console.warn('populate placeholders failed', e);
                            }
                        }
                    }
        } catch (e) {
            console.warn('Supabase fetch failed', e);
        }
    } else {
        // Supabase disabled or missing ITEM_ID — nothing to load.
    }

    // If no item data found from Supabase, show notfound UI
    if (!ITEM_DATA && ITEM_ID) {
        console.info('No item data found for', ITEM_ID);
        try {
            const statusText = document.getElementById('status-text');
            if (statusText) {
                statusText.innerText = 'This tag does not exist';
                statusText.style.color = '#D04648';
            }

            const nfTitle = document.getElementById('notfound-title');
            const nfMsg = document.getElementById('notfound-msg');
            const nfHome = document.getElementById('notfound-home');
            const nfBack = document.getElementById('notfound-back');
            if (nfTitle) nfTitle.innerText = 'Tag not recognized';
            if (nfMsg) nfMsg.innerText = `We don't have a record for tag ID ${ITEM_ID}. You can purchase a tag or try a different one.`;
            if (nfHome) nfHome.href = 'https://arcana-jewellery.netlify.app/';
            if (nfBack) nfBack.addEventListener('click', () => {
                // Redirect back to home page to allow user to scan another tag
                window.location.href = '/';
            });

            if (screens.connect) { screens.connect.classList.add('hidden-up'); screens.connect.classList.remove('active'); }
            if (screens.welcome) { screens.welcome.classList.add('hidden-up'); screens.welcome.classList.remove('active'); }
            if (screens.message) { screens.message.classList.add('hidden-up'); screens.message.classList.remove('active'); }
            if (screens.notfound) { screens.notfound.classList.remove('hidden-up'); screens.notfound.classList.add('active'); }
        } catch (e) { console.warn('show notfound failed', e); }
        return;
    }

    if (!ENABLE_CUSTOM_MODEL) return;

    const loader = new THREE.GLTFLoader();
    const modelSource = CUSTOM_MODEL_URL && CUSTOM_MODEL_URL.length ? CUSTOM_MODEL_URL : null;

    if (!modelSource) {
        console.warn('No model URL provided for ITEM_ID', ITEM_ID);
        return; // no model to load — Supabase did not return a model URL
    }

    // Configure DRACOLoader if available (required for Draco-compressed GLBs)
    if (THREE.DRACOLoader) {
        try {
            const dracoLoader = new THREE.DRACOLoader();
            dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
            loader.setDRACOLoader(dracoLoader);
        } catch (e) {
            console.warn('DRACOLoader setup failed:', e);
        }
    }

    // Load an HDRI for environment reflections, then load the model.
    const tryLoadHDR = function(hdrUrl, onEnvReady) {
        if (typeof THREE.RGBELoader === 'undefined') {
            onEnvReady(null);
            return;
        }
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();

        new THREE.RGBELoader()
            .setDataType(THREE.UnsignedByteType)
            .load(hdrUrl, function(hdrTexture) {
                const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
                scene.environment = envMap;
                hdrTexture.dispose();
                pmremGenerator.dispose();
                onEnvReady(envMap);
            }, undefined, function(err) {
                console.warn('HDR load failed, continuing without env map:', err);
                try { pmremGenerator.dispose(); } catch(e) {}
                onEnvReady(null);
            });
    };

    const HDR_URL = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/royal_esplanade_1k.hdr';

    tryLoadHDR(HDR_URL, function(envMap) {
        loader.load(
            modelSource,
            function (gltf) {
                console.info('Model loaded', modelSource);
                // Remove any existing visible object (including a visible fallback)
                try { if (jewel) scene.remove(jewel); } catch(e) {}
                try { if (fallbackJewel) scene.remove(fallbackJewel); } catch(e) {}

                jewel = gltf.scene;

                const box = new THREE.Box3().setFromObject(jewel);
                const size = box.getSize(new THREE.Vector3()).length();
                const desiredSize = 12;
                if (size > 0) {
                    const scale = desiredSize / size;
                    jewel.scale.set(scale, scale, scale);
                } else {
                    jewel.scale.set(5, 5, 5);
                }

                const center = box.getCenter(new THREE.Vector3());
                jewel.position.sub(center);

                const overallSize = box.getSize(new THREE.Vector3()).length();

                // Softer metal settings to reduce colorful HDR fringing
                const metalMat = new THREE.MeshPhysicalMaterial({
                    color: 0xE6E9EA,
                    metalness: 0.95,
                    roughness: 0.22,
                    clearcoat: 0.3,
                    clearcoatRoughness: 0.08,
                    envMap: envMap || null,
                    envMapIntensity: 0.6
                });

                const gemMat = new THREE.MeshPhysicalMaterial({
                    color: 0xffffff,
                    metalness: 0.0,
                    roughness: 0.02,
                    transmission: 1.0,
                    ior: 2.417,
                    reflectivity: 0.9,
                    thickness: 1.5,
                    envMap: envMap || null,
                    envMapIntensity: 1.0
                });

                jewel.traverse(function(o) {
                    if (o.isMesh) {
                        try {
                            o.geometry.computeBoundingSphere();
                            const meshRadius = o.geometry.boundingSphere ? o.geometry.boundingSphere.radius : 0;
                            const isGem = meshRadius > 0 && meshRadius < (overallSize * 0.22);
                            o.material = isGem ? gemMat : metalMat;
                        } catch (e) {
                            o.material = metalMat;
                        }
                    }
                });

                scene.add(jewel);
            },
            function (xhr) {
                // progress updates are intentionally quiet in production; remove noisy logs
                // if you need progress feedback during debugging, uncomment below.
                // if (xhr && xhr.loaded && xhr.total) {
                //   const pct = (xhr.loaded / xhr.total * 100).toFixed(2);
                //   console.info('Model load progress: ' + pct + '%');
                // }
            },
            function (error) {
                console.warn('Error loading custom model (CORS/path):', error);
                // No local fallback: model failed to load from Supabase-provided URL.
                // Keep scene empty or show UI-level notfound state as needed.
            }
        );
    });
}

// Start model loading (async) but don't block the rest of script
loadAndInitModel();

// --- PARTICLES (magical dust) ---
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 300;
const posArray = new Float32Array(particlesCount * 3);

for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 60;
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particlesMaterial = new THREE.PointsMaterial({
    size: 0.12,
    color: 0xC9A961,
    transparent: true,
    opacity: 0.4,
});
const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);


// --- INTERACTION VARIABLES ---
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - windowHalfX);
    mouseY = (event.clientY - windowHalfY);
});

// Only rotate model on canvas touch, not on UI elements
const canvasElement = document.querySelector('#canvas-container');
if (canvasElement) {
    canvasElement.style.pointerEvents = 'auto'; // Enable touch on canvas only when needed
    canvasElement.addEventListener('touchmove', (event) => {
        if (event.touches.length > 0) {
            mouseX = (event.touches[0].clientX - windowHalfX);
            mouseY = (event.touches[0].clientY - windowHalfY);
        }
    }, {passive: true});
}




// --- ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);

    targetX = mouseX * 0.001;
    targetY = mouseY * 0.001;

    // Apply gentle rotation when the model is present
    if (jewel) {
        jewel.rotation.y += 0.005 + 0.05 * (targetX - jewel.rotation.y);
        jewel.rotation.x += 0.002 + 0.05 * (targetY - jewel.rotation.x);
    }

    // Subtle particle motion
    particlesMesh.rotation.y -= 0.001;
    particlesMesh.rotation.x -= 0.001;

    renderer.render(scene, camera);
}

// Start the render loop
animate();

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});



// --- APP LOGIC ---

const screens = {
    connect: document.getElementById('screen-connect'),
    welcome: document.getElementById('screen-welcome'),
    notfound: document.getElementById('screen-notfound'),
    message: document.getElementById('screen-message')
};

// STARTUP SEQUENCE
function startUpSequence() {
    console.debug('startup: startUpSequence called, document.readyState=', document.readyState);
    // 1. Animate Progress Bar
    setTimeout(() => {
        const prog = document.getElementById('loader-progress');
        if (prog) prog.style.width = "100%";
    }, 100);

    // 2. Change Status Text
    setTimeout(() => {
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.innerText = "Link Established";
            statusText.style.color = "#C9A961"; // Force gold color
        }
        // Vibrate if on mobile
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    }, 2000);

    // 3. Transition to Welcome Screen
    setTimeout(() => {
        try {
            if (screens.connect) {
                screens.connect.classList.add('hidden-up');
                screens.connect.classList.remove('active');
            }
            if (screens.welcome) {
                screens.welcome.classList.remove('hidden-up');
                screens.welcome.classList.add('active');
            }

            // Trigger fade-ins
            const fadeEls = document.querySelectorAll('.fade-in-element');
            fadeEls.forEach(el => el.style.opacity = "1");

            // Zoom Jewel in slightly for the main view
            const targetZ = 35;
            const zoomInterval = setInterval(() => {
                if (getCameraDistance() > targetZ) {
                    setCameraDistance(getCameraDistance() - 0.1);
                } else {
                    clearInterval(zoomInterval);
                }
            }, 16);
        } catch (e) {
            console.error('startup: transition error', e);
        }
    }, 3500);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // DOM already parsed — start immediately
    startUpSequence();
} else {
    window.addEventListener('DOMContentLoaded', startUpSequence);
}

// NAVIGATION FUNCTIONS
function goToMessage() {
    screens.welcome.classList.add('hidden-up');
    screens.welcome.classList.remove('active');
    
    screens.message.classList.remove('hidden-up');
    screens.message.classList.add('active');
    
    // Move jewel further back for readability
     const targetZ = 60;
     const interval = setInterval(() => {
        if (getCameraDistance() < targetZ) {
            setCameraDistance(getCameraDistance() + 0.5);
        } else {
            clearInterval(interval);
        }
    }, 16);
}

function goToDetails() {
    screens.welcome.classList.add('hidden-up');
    screens.welcome.classList.remove('active');
    
    const screenDetails = document.getElementById('screen-details');
    screenDetails.classList.remove('hidden-up');
    screenDetails.classList.add('active');
    
    // Trigger staggered fade-in animation for detail cards
    setTimeout(() => {
        const detailCards = document.querySelectorAll('.details-card');
        detailCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('loaded');
            }, index * 100);
        });
    }, 200);
    
    // Move jewel back similar to message screen
    const targetZ = 60;
    const interval = setInterval(() => {
        if (getCameraDistance() < targetZ) {
            setCameraDistance(getCameraDistance() + 0.5);
        } else {
            clearInterval(interval);
        }
    }, 16);
}

function goBackToHome() {
    screens.message.classList.add('hidden-up');
    screens.message.classList.remove('active');
    
    const screenDetails = document.getElementById('screen-details');
    screenDetails.classList.add('hidden-up');
    screenDetails.classList.remove('active');
    
    screens.welcome.classList.remove('hidden-up');
    screens.welcome.classList.add('active');

    // Restore jewel position
    setCameraDistance(35);
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    toastMsg.innerText = message;
    toast.style.opacity = "1";
    setTimeout(() => {
        toast.style.opacity = "0";
    }, 3000);
}

function copyLink() {
    const dummyLink = "https://arcana.jewellery/p/8842-alex";
    
    // Clipboard API approach
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(dummyLink).then(() => {
            showToast("Link copied to clipboard");
        });
    } else {
        // Fallback
        let textArea = document.createElement("textarea");
        textArea.value = dummyLink;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast("Link copied to clipboard");
    }
}

async function shareContent() {
    const shareData = {
        title: 'Arcana Jewellery Memory',
        text: 'View my personalized Arcana memory.',
        url: 'https://arcana.jewellery/p/8842-alex'
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
            showToast("Shared successfully");
        } catch (err) {
            console.log('Share cancelled');
        }
    } else {
        copyLink(); // Fallback if native share isn't supported
    }
}
