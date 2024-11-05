class PixelArtEditor {
    constructor() {
        this.canvas = document.getElementById('pixelCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 16;
        this.pixelSize = 20;
        this.currentColor = '#000000';
        this.isDrawing = false;
        this.mode = 'draw';
        this.undoStack = [];
        this.saveState();

        this.initializeCanvas();
        this.setupEventListeners();
    }

    initializeCanvas() {
        this.canvas.width = this.gridSize * this.pixelSize;
        this.canvas.height = this.gridSize * this.pixelSize;
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
    }

    drawGrid() {
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= this.gridSize; i++) {
            const pos = i * this.pixelSize;
            this.ctx.beginPath();
            this.ctx.moveTo(pos, 0);
            this.ctx.lineTo(pos, this.canvas.height);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(0, pos);
            this.ctx.lineTo(this.canvas.width, pos);
            this.ctx.stroke();
        }
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseleave', this.stopDrawing.bind(this));

        document.getElementById('colorPicker').addEventListener('input', (e) => {
            this.currentColor = e.target.value;
            this.mode = 'draw';
        });

        document.getElementById('rainbowMode').addEventListener('click', () => {
            this.mode = this.mode === 'rainbow' ? 'draw' : 'rainbow';
        });

        document.getElementById('eyedropper').addEventListener('click', () => {
            this.mode = this.mode === 'eyedropper' ? 'draw' : 'eyedropper';
        });

        document.getElementById('fillTool').addEventListener('click', () => {
            this.mode = this.mode === 'fill' ? 'draw' : 'fill';
        });

        document.getElementById('shader').addEventListener('click', () => {
            this.mode = this.mode === 'shader' ? 'draw' : 'shader';
        });

        document.getElementById('lighter').addEventListener('click', () => {
            this.mode = this.mode === 'lighter' ? 'draw' : 'lighter';
        });

        document.getElementById('gridSize').addEventListener('input', (e) => {
            this.gridSize = parseInt(e.target.value);
            document.getElementById('gridSizeValue').textContent = `${this.gridSize}x${this.gridSize}`;
            this.initializeCanvas();
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearCanvas();
        });

        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undo();
        });

        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveImage();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportImage();
        });

        document.getElementById('themeToggle').addEventListener('click', () => {
            document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
            document.getElementById('themeToggle').textContent =
                document.body.dataset.theme === 'dark' ? '☀️' : '🌙';
        });
    }

    startDrawing(e) {
        this.isDrawing = true;
        this.draw(e);
    }

    draw(e) {
        if (!this.isDrawing) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.pixelSize);
        const y = Math.floor((e.clientY - rect.top) / this.pixelSize);

        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return;

        switch (this.mode) {
            case 'draw':
                this.drawPixel(x, y, this.currentColor);
                break;
            case 'rainbow':
                this.drawPixel(x, y, this.getRandomColor());
                break;
            case 'eyedropper':
                this.pickColor(x, y);
                break;
            case 'fill':
                this.fillArea(x, y);
                break;
            case 'shader':
                this.shadePixel(x, y);
                break;
            case 'lighter':
                this.lightenPixel(x, y);
                break;
        }
    }

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.saveState();
        }
    }

    drawPixel(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
        this.drawGrid();
    }

    getRandomColor() {
        return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    }

    pickColor(x, y) {
        const pixel = this.ctx.getImageData(x * this.pixelSize, y * this.pixelSize, 1, 1).data;
        this.currentColor = `#${[...pixel].slice(0, 3).map(x => x.toString(16).padStart(2, '0')).join('')}`;
        document.getElementById('colorPicker').value = this.currentColor;
        this.mode = 'draw';
    }

    fillArea(x, y) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const targetColor = this.getPixelColor(imageData, x, y);
        const fillColor = this.hexToRgb(this.currentColor);

        const stack = [[x, y]];
        while (stack.length > 0) {
            const [currentX, currentY] = stack.pop();
            if (this.shouldFill(imageData, currentX, currentY, targetColor)) {
                this.setPixelColor(imageData, currentX, currentY, fillColor);
                stack.push(
                    [currentX + 1, currentY],
                    [currentX - 1, currentY],
                    [currentX, currentY + 1],
                    [currentX, currentY - 1]
                );
            }
        }

        this.ctx.putImageData(imageData, 0, 0);
        this.drawGrid();
    }

    shadePixel(x, y) {
        const imageData = this.ctx.getImageData(x * this.pixelSize, y * this.pixelSize, 1, 1);
        const color = [...imageData.data];
        color[0] = Math.max(0, color[0] - 25);
        color[1] = Math.max(0, color[1] - 25);
        color[2] = Math.max(0, color[2] - 25);
        this.drawPixel(x, y, `rgb(${color[0]},${color[1]},${color[2]})`);
    }

    lightenPixel(x, y) {
        const imageData = this.ctx.getImageData(x * this.pixelSize, y * this.pixelSize, 1, 1);
        const color = [...imageData.data];
        color[0] = Math.min(255, color[0] + 25);
        color[1] = Math.min(255, color[1] + 25);
        color[2] = Math.min(255, color[2] + 25);
        this.drawPixel(x, y, `rgb(${color[0]},${color[1]},${color[2]})`);
    }

    getPixelColor(imageData, x, y) {
        const index = (y * this.gridSize + x) * 4;
        return [
            imageData.data[index],
            imageData.data[index + 1],
            imageData.data[index + 2],
            imageData.data[index + 3]
        ];
    }

    setPixelColor(imageData, x, y, color) {
        const index = (y * this.gridSize + x) * 4;
        imageData.data[index] = color[0];
        imageData.data[index + 1] = color[1];
        imageData.data[index + 2] = color[2];
        imageData.data[index + 3] = 255;
    }

    shouldFill(imageData, x, y, targetColor) {
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return false;
        const currentColor = this.getPixelColor(imageData, x, y);
        return currentColor.every((value, index) => value === targetColor[index]);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : null;
    }

    saveState() {
        this.undoStack.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
        if (this.undoStack.length > 50) this.undoStack.shift();
    }

    undo() {
        if (this.undoStack.length > 1) {
            this.undoStack.pop();
            const previousState = this.undoStack[this.undoStack.length - 1];
            this.ctx.putImageData(previousState, 0, 0);
        }
    }

    clearCanvas() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        this.saveState();
    }

    saveImage() {
        const link = document.createElement('a');
        link.download = 'pixel-art.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }

    exportImage() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.canvas, 0, 0);
        const link = document.createElement('a');
        link.download = 'pixel-art-no-grid.png';
        link.href = tempCanvas.toDataURL();
        link.click();
    }
}

// Initialize the editor
const editor = new PixelArtEditor();