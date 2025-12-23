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
    
    // 背景色：浅灰色
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, width, height);

    // 移动偏移量 (恢复至 0.002)
    offset += 0.002; 

    // 密度随滑动增加：初始间隔 1000，随滚动减小到 50
    // 使用 Math.pow(scrollPercent, 2) 让密度在开始时变化非常缓慢（长时间保持稀疏留白），后期快速加密
    let spacing = 1000 - (Math.pow(scrollPercent, 2) * 950);
    
    // 安全检查：确保 spacing 不会因为计算误差变得过小导致死循环 (OOM 修复)
    if (spacing < 20) spacing = 20;
    
    // 性能优化与平滑过渡
    // 当 spacing 很大时（接近 1000），线条应该完全透明；随着 spacing 减小，透明度逐渐增加
    // 设定一个阈值，例如 spacing 在 900 到 700 之间完成从 0 到 1 的透明度过渡
    let globalAlphaMultiplier = 1;
    if (spacing > 900) {
        globalAlphaMultiplier = 0;
    } else if (spacing > 700) {
        globalAlphaMultiplier = (900 - spacing) / 200;
    }

    if (globalAlphaMultiplier <= 0) {
        requestAnimationFrame(draw);
        return;
    }

    // 工业橙色 (Industrial Orange) - 略微提高透明度以确保可见
    const orangeStroke = `rgba(255, 102, 0, ${0.12 * globalAlphaMultiplier})`;
    // 深水泥灰 (Dark Cement Gray) - 略微提高透明度以确保可见
    const grayStroke = `rgba(128, 128, 128, ${0.08 * globalAlphaMultiplier})`;

    const cosRot = Math.cos(-0.087);
    const sinRot = Math.sin(-0.087);

    // 缓存常用值
    const scrollYFactor = scrollY * 0.1;
    const centerX = width / 2;
    const centerY = height / 2;

    // 整体旋转和偏移，实现从左下向右上移动的感觉
    ctx.save();
    // 旋转 -5 度 (约 -0.087 弧度)
    ctx.translate(centerX, centerY);
    ctx.rotate(-0.087); 
    ctx.translate(-centerX, -centerY);

    for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.strokeStyle = i === 0 ? orangeStroke : grayStroke;
        ctx.lineWidth = i === 0 ? 1.2 : 0.8;

        // 扩大绘制范围以覆盖旋转后的空白区域
        for (let y = -200; y < height + 200; y += spacing) {
            let first = true;
            for (let x = -200; x < width + 200; x += 20) { // 步长从15稍微增加到20，提升性能
                // 核心算法：通过 x, y 和 offset 的组合实现左下到右上的趋势
                const noiseX = x * 0.6 - offset * 20; 
                const noiseY = y * 0.6 + offset * 20;
                const wave = terrain.getHeight(noiseX, noiseY + scrollYFactor, offset);
                
                if (first) {
                    ctx.moveTo(x, y + wave);
                    first = false;
                } else {
                    ctx.lineTo(x, y + wave);
                }
            }
        }
        ctx.stroke();
    }
    ctx.restore();

    // 网格感线条 (也随旋转)
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-0.087);
    ctx.translate(-centerX, -centerY);
    ctx.beginPath();
    ctx.strokeStyle = `rgba(255, 102, 0, ${0.015 * globalAlphaMultiplier})`;
    for (let x = -200; x < width + 200; x += 150) {
        ctx.moveTo(x, -200);
        ctx.lineTo(x, height + 200);
    }
    ctx.stroke();
    ctx.restore();

    requestAnimationFrame(draw);
}

draw();
