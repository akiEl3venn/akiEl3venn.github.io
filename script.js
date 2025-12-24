// 背景绘制
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

let width, height;
let scrollY = 0;
let offset = 0;

let docHeight = 0;
let scrollPercent = 0;

function updateScrollData() {
    docHeight = document.documentElement.scrollHeight - window.innerHeight;
    let currentPercent = docHeight > 0 ? scrollY / docHeight : 0;
    // 确保 scrollPercent 在 0 到 1 之间，防止极端情况导致 spacing 计算错误
    scrollPercent = Math.max(0, Math.min(1, currentPercent));
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

window.addEventListener('resize', () => {
    resize();
    updateScrollData();
});
resize();

window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    updateScrollData();
}, { passive: true });

updateScrollData();

// 核心地形组件，负责生成复杂的等高线形态
class Terrain {
    constructor() {
        // 使用多个正弦波叠加模拟不同频率的地形
        this.seeds = Array.from({ length: 8 }, () => Math.random() * 1000);
    }

    // 核心形态算法：平缓中突然出现山峰
    getHeight(x, y, t) {
        // 1. 基础平缓波
        const base = Math.sin(x * 0.001 + t) * Math.cos(y * 0.001) * 0.2;
        
        // 2. 局部山峰生成逻辑 (使用指数函数实现“突然”的效果)
        let peakValue = 0;
        peakValue += Math.sin(x * 0.003 + this.seeds[0]) * Math.cos(y * 0.003 + this.seeds[1]);
        peakValue += Math.sin(x * 0.007 - this.seeds[2]) * Math.sin(y * 0.005 + this.seeds[3]) * 0.5;
        
        // 使用幂运算让低值更平缓，高值更陡峭
        // 只有当 peakValue 较大时，才会产生显著高度
        const peakSum = peakValue + 0.5;
        let peaks = 0;
        if (peakSum > 0) {
            peaks = Math.pow(peakSum, 3.5) * 15;
        }
        
        // 3. 细节微调
        const detail = Math.sin(x * 0.02 + y * 0.02 + t) * 0.5;
        
        return (base * 20 + peaks + detail);
    }
}

const terrain = new Terrain();

function draw() {
    ctx.clearRect(0, 0, width, height);
    
    // 移动偏移量
    offset += 0.002; 

    // 工业橙色 (Industrial Orange)
    const orangeStrokeBase = [255, 102, 0];
    // 深水泥灰 (Dark Cement Gray)
    const grayStrokeBase = [128, 128, 128];

    const centerX = width / 2;
    const centerY = height / 2;
    const scrollYFactor = scrollY * 0.1;

    // 整体旋转和偏移
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-0.087); 
    ctx.translate(-centerX, -centerY);

    // 这里的逻辑改为：我们不再用固定的 spacing 循环
    // 而是从一个起始位置开始，根据该位置的间距计算下一根线的位置
    // 为了覆盖视口，我们从当前 scrollY 向上和向下延伸
    
    // 基础间距函数：根据 absoluteY 返回间距
    // 顶部（0）稀疏，底部密集，或者随页面内容分布
    function getSpacingAt(absY) {
        let p = absY / (docHeight + height); // 归一化到整个文档长度
        p = Math.max(0, Math.min(1, p));
        // 使用与之前类似的幂函数，但在空间上分布
        return 1000 - (Math.pow(p, 2) * 950);
    }

    // 透明度函数
    function getAlphaAt(spacing) {
        if (spacing > 900) return 0;
        if (spacing > 700) return (900 - spacing) / 200;
        return 1;
    }

    // 绘制等高线
    for (let i = 0; i < 2; i++) {
        const baseColor = i === 0 ? orangeStrokeBase : grayStrokeBase;
        const lineWidth = i === 0 ? 1.2 : 0.8;
        const baseAlpha = i === 0 ? 0.12 : 0.08;

        // 我们需要找到视口内及边缘的所有线
        // 从 y = -400 (相对于视口) 开始，根据 absY 步进
        let currentRelY = -400;
        while (currentRelY < height + 400) {
            const absY = currentRelY + scrollY;
            const s = getSpacingAt(absY);
            const alpha = getAlphaAt(s);

            if (alpha > 0) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${baseAlpha * alpha})`;
                ctx.lineWidth = lineWidth;

                let first = true;
                for (let x = -200; x < width + 200; x += 25) {
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

            // 步进到下一根线，确保 s 至少有一个最小值防止死循环
            currentRelY += Math.max(20, s);
        }
    }
    ctx.restore();

    // 网格感线条 (也随旋转)
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-0.087);
    ctx.translate(-centerX, -centerY);
    ctx.beginPath();
    ctx.strokeStyle = `rgba(255, 102, 0, 0.015)`;
    for (let x = -200; x < width + 200; x += 150) {
        ctx.moveTo(x, -200);
        ctx.lineTo(x, height + 200);
    }
    ctx.stroke();
    ctx.restore();

    requestAnimationFrame(draw);
}

draw();

// --- 多语言切换 ---
function toggleLanguage() {
    const body = document.body;
    const btn = document.getElementById('lang-switch');

    // 切换 class
    body.classList.toggle('en-mode');

    // 检查当前是不是英文模式
    const isEn = body.classList.contains('en-mode');

    // 1. 更新按钮文字
    if (isEn) {
        btn.textContent = '中'; // 如果是英文模式，按钮显示“中”以便切回去
        localStorage.setItem('preferred-lang', 'en'); // 记住选择
    } else {
        btn.textContent = 'EN'; // 如果是中文模式，按钮显示“EN”
        localStorage.setItem('preferred-lang', 'cn'); // 记住选择
    }
}

// --- 页面加载时：检查用户之前的偏好 ---
document.addEventListener("DOMContentLoaded", function() {
    // 之前已有的代码...

    // 新增：检查语言设置
    const savedLang = localStorage.getItem('preferred-lang');
    if (savedLang === 'en') {
        // 如果用户上次选了英文，手动触发一次切换
        toggleLanguage();
    }
});