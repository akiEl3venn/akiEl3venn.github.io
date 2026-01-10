//核心交互 & 动画逻辑
document.addEventListener("DOMContentLoaded", function() {

    //检查语言偏好
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

    //打字机
    const cnSpan = document.getElementById('type-cn');
    const enSpan = document.getElementById('type-en');

    if (cnSpan && enSpan) {
        const cnText = cnSpan.innerText;
        const enText = enSpan.innerText;

        cnSpan.innerText = '';
        enSpan.innerText = '';
        cnSpan.classList.remove('finished');
        enSpan.classList.remove('finished');

        let i = 0;
        const speed = 25;
        const maxLength = Math.max(cnText.length, enText.length);

        function typeWriter() {
            if (i < maxLength) {
                if (i < cnText.length) cnSpan.innerText += cnText.charAt(i);
                if (i < enText.length) enSpan.innerText += enText.charAt(i);
                i++;
                setTimeout(typeWriter, speed);
            } else {
                revealRestOfHero();
            }
        }

        function revealRestOfHero() {
            const waitingElements = document.querySelectorAll('.wait-for-typewriter');
            waitingElements.forEach(el => el.classList.add('show'));
            setTimeout(() => {
                cnSpan.classList.add('finished');
                enSpan.classList.add('finished');
            }, 1000);
        }

        setTimeout(typeWriter, 500);
    }

    // 回到顶部逻辑 (融合到高度计箭头)
    const altMarker = document.getElementById('alt-marker');
    if (altMarker) {
        altMarker.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // 移动端回到顶部逻辑
    const mobileRtbBtn = document.getElementById('mobile-rtb');
    if (mobileRtbBtn) {
        mobileRtbBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // 监听滚动以显示/隐藏移动端按钮
        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                mobileRtbBtn.classList.add('visible');
            } else {
                mobileRtbBtn.classList.remove('visible');
            }
        }, { passive: true });
    }
});

//辅助功能
//高度计
function updateAltimeter() {
    const marker = document.getElementById('alt-marker');
    const valText = document.getElementById('alt-val');

    const scrollTop = window.scrollY;
    // 使用 body.scrollHeight 有时比 documentElement 更准，取最大值保险
    const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;

    let scrollPercent = 0;
    if (docHeight > 0) {
        scrollPercent = scrollTop / docHeight;
    }
    scrollPercent = Math.max(0, Math.min(1, scrollPercent));

    if(marker) {
        // 直接设置 style.top，配合 CSS 的 mask 实现进出
        marker.style.top = `${scrollPercent * 100}%`;

        // 自动显示 RTB 提示 (当滚动超过 Hero 区域后)
        if (window.scrollY > window.innerHeight * 0.8) {
            marker.classList.add('show-rtb');
        } else {
            marker.classList.remove('show-rtb');
        }
    }

    if(valText) {
        // 增加一点随机抖动，模拟真实仪表盘的数据波动
        // 只有当滚动时才计算，或者偶尔跳动
        const noise = Math.random() > 0.8 ? Math.floor(Math.random() * 2) : 0;
        const displayVal = Math.floor(scrollPercent * 100) + noise;
        valText.innerText = Math.min(100, Math.max(0, displayVal)).toString().padStart(3, '0');
    }
}

//更多项目切换
function toggleMore() {
    const grid = document.getElementById('moreGrid');
    grid.classList.toggle('open');
    // 触发一次滚动数据更新，以便背景重新计算
    setTimeout(updateScrollData, 800); // 等待动画大致完成
}

//多语言
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

// 背景地形生成 (Canvas)
const canvas = document.createElement('canvas');
canvas.id = 'bg-canvas';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

let width, height;
let scrollY = 0;
let offset = 0;
let docHeight = 0;
let targetDocHeight = 0; // 目标高度，用于平滑过渡

function updateScrollData() {
    // 获取准确的文档总高度
    const currentHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    // 如果是第一次初始化，直接赋值
    if (targetDocHeight === 0) {
        targetDocHeight = currentHeight;
        docHeight = currentHeight;
    } else {
        targetDocHeight = currentHeight;
    }
    scrollY = window.scrollY;
    updateAltimeter();
}

// 引入 ResizeObserver 监听 Body 高度变化，解决小窗口布局变动导致的计算错误
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

// 地形
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

// 基于视口保护的密度算法 ---
function getSpacingAt(y) {
    const effectiveY = Math.max(0, y - height);
    const effectiveTotal = Math.max(1, docHeight - height); // 防止除以0
    let p = effectiveY / effectiveTotal;
    p = Math.max(0, Math.min(1, p));

    // Top (Hero区域及刚过Hero): 间距 1200px (极大，保证只有1根线)
    // Bottom (页面底部): 间距 60px (原本设计的密集度)
    const startSpacing = 1200;
    const endSpacing = 60;
    // 线性过渡
    return startSpacing - (p * (startSpacing - endSpacing));
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    // 动画偏移量
    offset += 0.025;
    
    // 平滑过渡 docHeight
    if (Math.abs(targetDocHeight - docHeight) > 1) {
        docHeight += (targetDocHeight - docHeight) * 0.05; // 缓动系数
    } else {
        docHeight = targetDocHeight;
    }

    const orangeStrokeBase = [255, 102, 0];
    const grayStrokeBase = [128, 128, 128];
    const centerX = width / 2;
    const centerY = height / 2;
    // 视差系数
    const scrollYFactor = scrollY * 0.2;
    const verticalParallaxSpeed = 0.5;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-0.087);
    ctx.translate(-centerX, -centerY);

    for (let i = 0; i < 2; i++) {
        const baseColor = i === 0 ? orangeStrokeBase : grayStrokeBase;
        const lineWidth = i === 0 ? 1.5 : 0.8;
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
            // 步进
            currentRelY += Math.max(20, spacing);
        }
    }
    ctx.restore();

    // 装饰网格
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-0.087);
    ctx.translate(-centerX, -centerY);
    ctx.beginPath();
    ctx.strokeStyle = `rgba(255, 102, 0, 0.015)`;
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