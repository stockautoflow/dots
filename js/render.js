export class RenderEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.initCanvas();
    }

    initCanvas() {
        // Retina対応
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.logicalWidth = rect.width;
        this.logicalHeight = rect.height;
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
        return '#ff6b6b'; // default red
    }

    drawDots(value, skin, customPositions = null) {
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
                const x = radius + margin + Math.random() * (width - (radius + margin) * 2);
                const y = radius + margin + Math.random() * (height - (radius + margin) * 2);
                
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
                // ジッタードグリッドへのフォールバック
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
                const jitterX = (Math.random() - 0.5) * (cellW - radius * 2);
                const jitterY = (Math.random() - 0.5) * (cellH - radius * 2);
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
        
        // progress: 0.0 (離れている) -> 1.0 (本来の位置)
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
}\n