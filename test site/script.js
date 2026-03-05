// Core interaction & animation logic
document.addEventListener("DOMContentLoaded", function() {

    // Check language preference
    const savedLang = localStorage.getItem('preferred-lang');
    if (savedLang === 'en') {
        toggleLanguage();
    }

    const observerOptions = {
        root: null,
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
            } else {
                entry.target.classList.remove("active");
            }
        });
    }, observerOptions);

    const elements = document.querySelectorAll('.reveal-text');
    elements.forEach(el => observer.observe(el));

    // Typewriter effect
    const cnContainer = document.getElementById('type-cn');
    const enContainer = document.getElementById('type-en');

    if (cnContainer && enContainer) {

        // 1. Parse function: Parse HTML structure into an array of segments to be typed
        // This preserves class (color) information
        function parseContent(container) {
            const segments = [];
            // Traverse child nodes (span or text)
            container.childNodes.forEach(node => {
                if (node.nodeType === 3) { // Text node
                    segments.push({ text: node.textContent, className: '' });
                } else if (node.nodeType === 1) { // Element node (span)
                    segments.push({ text: node.textContent, className: node.className });
                }
            });
            return segments;
        }

        // 2. Initialization
        const cnSegments = parseContent(cnContainer);
        const enSegments = parseContent(enContainer);

        // 3. Clear container and prep for typing
        cnContainer.innerHTML = '';
        enContainer.innerHTML = '';
        cnContainer.classList.remove('finished');
        enContainer.classList.remove('finished');

        // Remove the class that initially hides the container to prevent FOUC
        cnContainer.classList.remove('hide-initial');
        enContainer.classList.remove('hide-initial');
        cnContainer.classList.add('typing-started');
        enContainer.classList.add('typing-started');

        // 4. State trackers
        // We track: which segment we are on (segIndex), which char in segment (charIndex)
        let cnState = { segIndex: 0, charIndex: 0, currentSpan: null };
        let enState = { segIndex: 0, charIndex: 0, currentSpan: null };

        // Calculate total length for ending loop properly
        const cnTotalLen = cnSegments.reduce((sum, seg) => sum + seg.text.length, 0);
        const enTotalLen = enSegments.reduce((sum, seg) => sum + seg.text.length, 0);
        const maxLength = Math.max(cnTotalLen, enTotalLen);

        let globalIndex = 0; // Global counter
        const speed = 25;    // Typing speed

        // 5. Single step print function
        function typeStep(container, segments, state) {
            if (state.segIndex >= segments.length) return;

            const currentSegment = segments[state.segIndex];

            // Create span if entering a new segment
            if (!state.currentSpan) {
                state.currentSpan = document.createElement('span');
                if (currentSegment.className) {
                    state.currentSpan.className = currentSegment.className;
                }
                container.appendChild(state.currentSpan);
            }

            // Append character
            const char = currentSegment.text[state.charIndex];
            state.currentSpan.textContent += char;
            state.charIndex++;

            // Check if segment is finished
            if (state.charIndex >= currentSegment.text.length) {
                state.segIndex++;
                state.charIndex = 0;
                state.currentSpan = null;
            }
        }

        // 6. Core loop
        function typeWriterLoop() {
            if (globalIndex < maxLength) {
                if (globalIndex < cnTotalLen) typeStep(cnContainer, cnSegments, cnState);
                if (globalIndex < enTotalLen) typeStep(enContainer, enSegments, enState);

                globalIndex++;
                setTimeout(typeWriterLoop, speed);
            } else {
                revealRestOfHero();
            }
        }

        function revealRestOfHero() {
            const waitingElements = document.querySelectorAll('.wait-for-typewriter');
            waitingElements.forEach(el => el.classList.add('show'));
            setTimeout(() => {
                cnContainer.classList.add('finished');
                enContainer.classList.add('finished');
            }, 1000);
        }

        // Start
        setTimeout(typeWriterLoop, 500);
    }

    // Back to top logic (integrated into altimeter marker)
    const altMarker = document.getElementById('alt-marker');
    if (altMarker) {
        altMarker.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Mobile back to top logic
    const mobileRtbBtn = document.getElementById('mobile-rtb');
    if (mobileRtbBtn) {
        mobileRtbBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // Listen to scroll to show/hide mobile button
        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                mobileRtbBtn.classList.add('visible');
            } else {
                mobileRtbBtn.classList.remove('visible');
            }
        }, { passive: true });
    }
});

// Auxiliary functions
// Altimeter
function updateAltimeter() {
    const marker = document.getElementById('alt-marker');
    const valText = document.getElementById('alt-val');

    const scrollTop = window.scrollY;
    // Using body.scrollHeight is sometimes more accurate, taking the max for safety
    const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;

    let scrollPercent = 0;
    if (docHeight > 0) {
        scrollPercent = scrollTop / docHeight;
    }
    scrollPercent = Math.max(0, Math.min(1, scrollPercent));

    if(marker) {
        // Set style.top directly, works with CSS mask for transitions
        marker.style.top = `${scrollPercent * 100}%`;

        // Automatically show RTB prompt after scrolling past Hero section
        if (window.scrollY > window.innerHeight * 0.8) {
            marker.classList.add('show-rtb');
        } else {
            marker.classList.remove('show-rtb');
        }
    }

    if(valText) {
        // Add slight random jitter to simulate real dashboard data fluctuation
        const noise = Math.random() > 0.8 ? Math.floor(Math.random() * 2) : 0;
        const displayVal = Math.floor(scrollPercent * 100) + noise;
        valText.innerText = Math.min(100, Math.max(0, displayVal)).toString().padStart(3, '0');
    }
}

// Toggle more projects
function toggleMore() {
    const grid = document.getElementById('moreGrid');
    grid.classList.toggle('open');
    // Trigger scroll data update to recalculate background
    setTimeout(updateScrollData, 800);
}

// Multi-language
function toggleLanguage() {
    const body = document.body;
    const btn = document.getElementById('lang-switch');
    if (!btn) return;

    body.classList.toggle('en-mode');
    const isEn = body.classList.contains('en-mode');

    if (isEn) {
        btn.textContent = '中';
        localStorage.setItem('preferred-lang', 'en');
    } else {
        btn.textContent = 'EN';
        localStorage.setItem('preferred-lang', 'cn');
    }
}

// Background terrain generation (Canvas)
const canvas = document.createElement('canvas');
canvas.id = 'bg-canvas';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

let width, height;
let scrollY = 0;
let offset = 0;
let docHeight = 0;
let targetDocHeight = 0;

function updateScrollData() {
    const currentHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    if (targetDocHeight === 0) {
        targetDocHeight = currentHeight;
        docHeight = currentHeight;
    } else {
        targetDocHeight = currentHeight;
    }
    scrollY = window.scrollY;
    updateAltimeter();
}

// Use ResizeObserver to monitor Body height changes
const resizeObserver = new ResizeObserver(() => {
    updateScrollData();
});
resizeObserver.observe(document.body);

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    updateScrollData();
}

window.addEventListener('resize', resize);
resize();

window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    updateAltimeter();
}, { passive: true });

updateScrollData();

// Terrain class
class Terrain {
    constructor() {
        this.seeds = Array.from({ length: 8 }, () => Math.random() * 1000);
    }
    getHeight(x, y, t) {
        const base = Math.sin(x * 0.001 + t) * Math.cos(y * 0.001) * 0.2;
        let peakValue = 0;
        peakValue += Math.sin(x * 0.003 + this.seeds[0]) * Math.cos(y * 0.003 + this.seeds[1]);
        peakValue += Math.sin(x * 0.007 - this.seeds[2]) * Math.sin(y * 0.005 + this.seeds[3]) * 0.5;
        const peakSum = peakValue + 0.5;
        let peaks = 0;
        if (peakSum > 0) {
            peaks = Math.pow(peakSum, 3.5) * 15;
        }
        const detail = Math.sin(x * 0.02 + y * 0.02 + t) * 0.5;
        return (base * 20 + peaks + detail);
    }
}

const terrain = new Terrain();

// Density algorithm based on viewport protection
function getSpacingAt(y) {
    const effectiveY = Math.max(0, y - height);
    const effectiveTotal = Math.max(1, docHeight - height);
    let p = effectiveY / effectiveTotal;
    p = Math.max(0, Math.min(1, p));

    // Top spacing 1200px, bottom spacing 60px
    const startSpacing = 1200;
    const endSpacing = 60;

    return startSpacing - (p * (startSpacing - endSpacing));
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    offset += 0.025;

    if (Math.abs(targetDocHeight - docHeight) > 1) {
        docHeight += (targetDocHeight - docHeight) * 0.05;
    } else {
        docHeight = targetDocHeight;
    }

    // Light Theme specific stroke colors
    const blueStrokeBase = [11, 61, 145];
    const darkGrayStrokeBase = [50, 50, 50];

    const centerX = width / 2;
    const centerY = height / 2;
    const scrollYFactor = scrollY * 0.2;
    const verticalParallaxSpeed = 0.5;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-0.087);
    ctx.translate(-centerX, -centerY);

    for (let i = 0; i < 2; i++) {
        const baseColor = i === 0 ? blueStrokeBase : darkGrayStrokeBase;
        const lineWidth = i === 0 ? 1.0 : 0.6;
        const baseAlpha = i === 0 ? 0.12 : 0.06;
        let currentRelY = -1000 - (scrollY * verticalParallaxSpeed);

        while (currentRelY < height + 500) {
            const absY = currentRelY + scrollY;
            const spacing = getSpacingAt(Math.max(0, absY));
            if (currentRelY > -600 && currentRelY < height + 600) {
                let alpha = baseAlpha;
                if (spacing > 800) alpha *= 0.7;
                ctx.beginPath();
                ctx.strokeStyle = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${alpha})`;
                ctx.lineWidth = lineWidth;
                let first = true;
                for (let x = -200; x < width + 200; x += 40) {
                    const noiseX = x * 0.6 - offset * 20;
                    const noiseY = currentRelY * 0.6 + offset * 20;
                    const wave = terrain.getHeight(noiseX, noiseY + scrollYFactor, offset);
                    if (first) {
                        ctx.moveTo(x, currentRelY + wave);
                        first = false;
                    } else {
                        ctx.lineTo(x, currentRelY + wave);
                    }
                }
                ctx.stroke();
            }
            // Step
            currentRelY += Math.max(20, spacing);
        }
    }
    ctx.restore();

    // Decorative background grid
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-0.087);
    ctx.translate(-centerX, -centerY);
    ctx.beginPath();
    ctx.strokeStyle = `rgba(0, 0, 0, 0.02)`;
    const gridOffset = -(scrollY * 0.1) % 150;
    for (let x = -200; x < width + 200; x += 150) {
        ctx.moveTo(x, -200 + gridOffset);
        ctx.lineTo(x, height + 200 + gridOffset);
    }
    ctx.stroke();
    ctx.restore();

    requestAnimationFrame(draw);
}
draw();