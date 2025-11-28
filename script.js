// --- CONFIGURATION ---
// To replace the fallback torus knot with your jewellery piece set
// ENABLE_CUSTOM_MODEL = true and either:
//  - put a file named `model.glb` in the project root, OR
//  - set CUSTOM_MODEL_URL to a direct URL to a .glb/.gltf file (CORS must allow loading)
// Examples:
// const ENABLE_CUSTOM_MODEL = true; // to attempt loading a custom model
// const CUSTOM_MODEL_URL = 'model.glb'; // local file placed in the same folder
// const CUSTOM_MODEL_URL = 'https://example.com/path/to/your-model.glb'; // remote URL
// Enable loading of a custom model if available.
const ENABLE_CUSTOM_MODEL = true;
// Determine model source from the `item` URL parameter (e.g. device.html?item=8842).
// If an item id is present we attempt to load `<item>.glb` first, otherwise
// fall back to `model.glb`.
const urlParamsForModel = new URLSearchParams(window.location.search);
const ITEM_ID = urlParamsForModel.get('item');
let CUSTOM_MODEL_URL = '';
if (ITEM_ID) {
    CUSTOM_MODEL_URL = `${ITEM_ID}.glb`;
} else {
    CUSTOM_MODEL_URL = 'model.glb';
}

// Supabase integration toggle. When true, the script will try to fetch
// item metadata from a Supabase table `items` using the REST API.
// Configure these values before enabling in production.
const USE_SUPABASE = true; // set to true to enable Supabase lookups
const SUPABASE_URL = 'https://gktehkfaiqutjrunfyah.supabase.co' // e.g. 'https://xyzcompany.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_vDVciGc-1-vg0HXe3MmHAg_V6Ea90hQ' // project anon key (public)

// --- INITIALIZE ICONS ---
lucide.createIcons();

// --- THREE.JS BACKGROUND SETUP ---
const scene = new THREE.Scene();
// Add subtle fog for depth (light theme)
scene.fog = new THREE.FogExp2(0xFFFFFF, 0.01);

// Shared references for the loaded jewel and fallback object.
// Declare here so the animation loop can reference them safely before load.
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
// We'll fetch a simple `items.json` manifest if present and use it to
// override model/video/text/from for the current `ITEM_ID`.
let ITEM_DATA = null;

async function fetchItemsManifest() {
    try {
        const resp = await fetch('items.json', {cache: 'no-store'});
        if (!resp.ok) return null;
        const manifest = await resp.json();
        return manifest;
    } catch (e) {
        return null;
    }
}

async function loadAndInitModel() {
    // Prefer Supabase manifest when enabled, otherwise fall back to local items.json
    let manifest = null;
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
                    // map row directly to ITEM_DATA fields used elsewhere
                    ITEM_DATA = rows[0];
                    if (ITEM_DATA.model_url) CUSTOM_MODEL_URL = ITEM_DATA.model_url;
                    // populate placeholders
                    try {
                        const elFrom = document.getElementById('message-from');
                        const elSign = document.getElementById('message-sign');
                        const elItem = document.getElementById('item-id-label');
                        const vidIframe = document.getElementById('embedded-iframe');
                        if (elFrom && ITEM_DATA.sender) elFrom.innerText = `From: ${ITEM_DATA.sender}`;
                        if (elSign && ITEM_DATA.sender) elSign.innerText = `- ${ITEM_DATA.sender}`;
                        if (elItem) elItem.innerText = `Authenticated Item #${ITEM_ID}`;
                        if (vidIframe && ITEM_DATA.video_url) vidIframe.src = ITEM_DATA.video_url;
                    } catch (e) {}
                }
            }
        } catch (e) {
            console.warn('Supabase manifest fetch failed, falling back to local manifest', e);
            manifest = await fetchItemsManifest();
        }
    } else {
        manifest = await fetchItemsManifest();
    }

    if (!ITEM_DATA && manifest && ITEM_ID && manifest[ITEM_ID]) {
        ITEM_DATA = manifest[ITEM_ID];
        if (ITEM_DATA.model) CUSTOM_MODEL_URL = ITEM_DATA.model;
        try {
            const elFrom = document.getElementById('message-from');
            const elSign = document.getElementById('message-sign');
            const elItem = document.getElementById('item-id-label');
            const vidIframe = document.getElementById('embedded-iframe');
            if (elFrom && ITEM_DATA.from) elFrom.innerText = `From: ${ITEM_DATA.from}`;
            if (elSign && ITEM_DATA.from) elSign.innerText = `- ${ITEM_DATA.from}`;
            if (elItem) elItem.innerText = `Authenticated Item #${ITEM_ID}`;
            if (vidIframe && ITEM_DATA.video) vidIframe.src = ITEM_DATA.video;
        } catch (e) {}
    }

    if (!ENABLE_CUSTOM_MODEL) return;

    const loader = new THREE.GLTFLoader();
    const modelSource = (CUSTOM_MODEL_URL && CUSTOM_MODEL_URL.length) ? CUSTOM_MODEL_URL : 'model.glb';

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
                console.log('Model loaded successfully from', modelSource);
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
                if (xhr && xhr.loaded && xhr.total) {
                    const pct = (xhr.loaded / xhr.total * 100).toFixed(2);
                    console.log('Model load progress: ' + pct + '%');
                }
            },
            function (error) {
                console.warn('Error loading custom model (check console for CORS/Path errors):', error);
                // If the custom model fails to load, show the fallback so users
                // still see something interactive instead of the torus flashing briefly.
                createFallbackJewel(true);
            }
        );
    });
}

// Start model loading (async) but don't block the rest of script
loadAndInitModel();

// --- PARTICLES (Magical Dust) ---
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

document.addEventListener('touchmove', (event) => {
    if (event.touches.length > 0) {
        mouseX = (event.touches[0].clientX - windowHalfX);
        mouseY = (event.touches[0].clientY - windowHalfY);
    }
}, {passive: true});




// --- ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);

    targetX = mouseX * 0.001;
    targetY = mouseY * 0.001;

    // Only animate if the jewel object has been created/loaded
    if (jewel) {
        // Smooth rotation
        jewel.rotation.y += 0.005;
        jewel.rotation.x += 0.002;

        // Add interaction drift
        jewel.rotation.y += 0.05 * (targetX - jewel.rotation.y);
        jewel.rotation.x += 0.05 * (targetY - jewel.rotation.x);
    }

    // Animate particles slowly
    particlesMesh.rotation.y -= 0.001;
    particlesMesh.rotation.x -= 0.001;

    renderer.render(scene, camera);
}
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

function goBackToHome() {
    screens.message.classList.add('hidden-up');
    screens.message.classList.remove('active');
    
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
