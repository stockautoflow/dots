export class RenderEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
    }

    initCanvas(bgColor = '#f0f8ff') {
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.style.display = 'block';
        
        // ★修正: アスペクト比を4:3に完全固定し、画面幅に合わせて縮小させる
        this.canvas.style.width = '100%';
        this.canvas.style.maxWidth = '800px';
        this.canvas.style.aspectRatio = '4 / 3';
        this.canvas.style.height = 'auto';
        
        this.canvas.style.flexShrink = '0'; 
        this.canvas.style.margin = 'auto'; 
        
        this.canvas.style.backgroundColor = bgColor; 
        this.canvas.style.border = '4px solid #333';
        this.canvas.style.borderRadius = '10px';
        this.canvas.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';

        // 内部解像度は800x600で固定（CSS側で縮小されても歪まない）
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

    drawItem(x, y, r, skin, dotColor) {
        if (skin === 'circle' || skin === 'dynamic') {
            this.ctx.fillStyle = dotColor;
            this.ctx.beginPath();
            this.ctx.arc(x, y, r, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            this.ctx.font = `${r * 2.5}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(skin, x, y);
        }
    }

    drawDots(value, skin, dotColor, customPositions = null) {
        if (!this.logicalWidth) this.initCanvas();
        this.clear();
        const r = this.getDotRadius(value);
        
        let positions = customPositions || this.generatePositions(value, r, this.logicalWidth, this.logicalHeight);

        for (const pos of positions) {
            this.drawItem(pos.x, pos.y, r, skin, dotColor);
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

    drawQuizScreen(leftNum, rightNum, skin, dotColor) {
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
        
        for (const p of posLeft) {
            this.drawItem(p.x, p.y, rLeft, skin, dotColor);
        }
        for (const p of posRight) {
            this.drawItem(p.x + this.logicalWidth / 2, p.y, rRight, skin, dotColor);
        }
    }

    drawFormulaAnimation(positionsA, positionsB, skin, dotColor, progress) {
        this.clear();
        const offset = (1 - progress) * (this.logicalWidth / 4);
        const r = this.getDotRadius(positionsA.length + positionsB.length);
        
        for (const p of positionsA) {
            this.drawItem(p.x - offset, p.y, r, skin, dotColor);
        }
        for (const p of positionsB) {
            this.drawItem(p.x + offset, p.y, r, skin, dotColor);
        }
    }
}
