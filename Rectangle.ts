export interface Point {
    x: number;
    y: number;
}


export interface Rect extends Point {
    width: number;
    height: number;
}


export class Rectangle {
    readonly shape = 'rectangle';
    points: Array<Point> = [];
    rect: Rect = { x: -1, y: -1, width: -1, height: -1 };
    color = 'black'; // 边框颜色
    selected = false;

    constructor (startX: number, startY: number, endX: number, endY: number, color: string, selected = false) {
        this.setPointsRect(startX, startY, endX, endY);
        this.color = color;
        this.selected = selected;
    }

    setPointsRect (startX: number, startY: number, endX: number, endY: number) {
        let minX: number, maxX: number, minY: number, maxY: number;
        if (startX < endX) {
            minX = startX;
            maxX = endX;
        } else {
            minX = endX;
            maxX = startX;
        }

        if (startY < endY) {
            minY = startY;
            maxY = endY;
        } else {
            minY = endY;
            maxY = startY;
        }

        this.points = [
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: maxX, y: maxY },
            { x: minX, y: maxY }
        ];

        this.rect = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    static draw (context: CanvasRenderingContext2D, points: Array<Point>, borderColor: string, backgroundColor: string) {
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            const point: Point = points[i];
            context.lineTo(point.x, point.y);
        }
        context.closePath();

        context.strokeStyle = borderColor;
        context.stroke();

        context.fillStyle = backgroundColor;
        context.fill();


    }
}

