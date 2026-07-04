export class RenderEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.initCanvas();
    }

    initCanvas() {
        const dpr = window.devicePixelRatio || 1;
        
        // ★修正: CSSに依存せずJSから強制的にスタイルを叩き込む
        this.canvas.style.display = 'block';
        this.canvas.style.width = '800px';
        this.canvas.style.height = '600px';
        this.canvas.style.maxWidth = '95vw';
        this.canvas.style.maxHeight = '75vh';
        this.canvas.style.flexShrink = '0'; 
        this.canvas.style.margin = 'auto'; // 中央配置
        
        // ★視認性アップ: 鮮やかなシアンの背景と、太い黒枠をつける
        this.canvas.style.backgroundColor = '#00FFFF'; // シアン
        this.canvas.style.border = '4px solid #333';
        this.canvas.style.borderRadius = '10px';
        this.canvas.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';

        const logicalWidth = 800;
        const logicalHeight = 600;

        this.canvas.width = logicalWidth * dpr;
        this.canvas.height = logicalHeight * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.logicalWidth = logicalWidth;
        this.logicalHeight = logicalHeight;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
    }

    getDotRadius(value) {
        if (value <= 20) return 15;
        if (value <= 35) return 12;
        return 10;
    }

    getColor(skin) {
        if (skin === 'blue_circle') return '#3182ce';
        return '#ff6b6b';
    }

    drawDots(value, skin, customPositions = null) {
        // フェールセーフ: サイズが未設定なら再初期化
        if (!this.logicalWidth) this.initCanvas();
        
        this.clear();
        const r = this.getDotRadius(value);
        const color = this.getColor(skin);
        
        let positions = customPositions || this.generatePositions(value, r, this.logicalWidth, this.logicalHeight);

        this.ctx.fillStyle = color;
        for (const pos of positions) {
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    generatePositions(count, radius, width, height) {
        const positions = [];
        const margin = 10;
        const minDistance = (radius * 2) + margin;
        
        for (let i = 0; i < count; i++) {
            let placed = false;
            for (let attempts = 0; attempts < 100; attempts++) {
                const safeWidth = Math.max(0, width - (radius + margin) * 2);
                const safeHeight = Math.max(0, height - (radius + margin) * 2);
                
                const x = radius + margin + Math.random() * safeWidth;
                const y = radius + margin + Math.random() * safeHeight;
                
                let overlap = false;
                for (const p of positions) {
                    if (Math.hypot(p.x - x, p.y - y) < minDistance) {
                        overlap = true;
                        break;
                    }
                }
                
                if (!overlap) {
                    positions.push({x, y});
                    placed = true;
                    break;
                }
            }
            
            if (!placed) {
                return this.generateJitteredGrid(count, radius, width, height);
            }
        }
        return positions;
    }

    generateJitteredGrid(count, radius, width, height) {
        const positions = [];
        const cols = Math.ceil(Math.sqrt(count * (width / height)));
        const rows = Math.ceil(count / cols);
        const cellW = width / cols;
        const cellH = height / rows;
        
        let added = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (added >= count) break;
                const cx = c * cellW + cellW / 2;
                const cy = r * cellH + cellH / 2;
                const jitterX = (Math.random() - 0.5) * Math.max(0, cellW - radius * 2);
                const jitterY = (Math.random() - 0.5) * Math.max(0, cellH - radius * 2);
                positions.push({x: cx + jitterX, y: cy + jitterY});
                added++;
            }
        }
        return positions;
    }

    drawQuizScreen(leftNum, rightNum, skin) {
        this.clear();
        this.ctx.beginPath();
        this.ctx.setLineDash([5, 15]);
        this.ctx.moveTo(this.logicalWidth / 2, 0);
        this.ctx.lineTo(this.logicalWidth / 2, this.logicalHeight);
        this.ctx.strokeStyle = '#ccc';
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        const rLeft = this.getDotRadius(leftNum);
        const posLeft = this.generatePositions(leftNum, rLeft, this.logicalWidth / 2, this.logicalHeight);
        
        const rRight = this.getDotRadius(rightNum);
        const posRight = this.generatePositions(rightNum, rRight, this.logicalWidth / 2, this.logicalHeight);
        
        this.ctx.fillStyle = this.getColor(skin);
        
        for (const p of posLeft) {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, rLeft, 0, Math.PI * 2);
            this.ctx.fill();
        }
        for (const p of posRight) {
            this.ctx.beginPath();
            this.ctx.arc(p.x + this.logicalWidth / 2, p.y, rRight, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawFormulaAnimation(positionsA, positionsB, skin, progress) {
        this.clear();
        this.ctx.fillStyle = this.getColor(skin);
        
        const offset = (1 - progress) * (this.logicalWidth / 4);
        const r = this.getDotRadius(positionsA.length + positionsB.length);
        
        for (const p of positionsA) {
            this.ctx.beginPath();
            this.ctx.arc(p.x - offset, p.y, r, 0, Math.PI * 2);
            this.ctx.fill();
        }
        for (const p of positionsB) {
            this.ctx.beginPath();
            this.ctx.arc(p.x + offset, p.y, r, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
}
